import Material from './material'
import Renderer from '../Renderer'
import { Color } from '../types'

type IProps = {
	points: Float32Array
	colorList?: [Color, Color, Color, Color, Color]
	offsets?: [number, number, number, number, number]
	maxHeatValue?: number | ((maxValue: number) => number)
	radius?: number
}

const computeShaderCode = `
    const prec = 10000f;
    @group(0) @binding(0) var<storage> input: array<vec2f>;
    @group(0) @binding(1) var<storage, read_write> output: array<atomic<u32>>;
    @group(0) @binding(2) var<uniform> grid: vec2u;
    @group(0) @binding(3) var<uniform> resolution: vec2f;
    @group(0) @binding(4) var<uniform> radius: f32;
    @group(0) @binding(5) var<uniform> projectionMatrix: mat4x4f;
    @group(0) @binding(6) var<uniform> viewMatrix: mat4x4f;

    fn getIndex(id: vec2u) -> u32 {
        return (id.y % grid.y) * grid.x + (id.x % grid.x);
    }

    @compute @workgroup_size(1, 1, 1)
    fn main(@builtin(global_invocation_id) id: vec3u){
        let index = getIndex(id.xy);
        if(index >= arrayLength(&input)){
            return;
        }
        let point = projectionMatrix * viewMatrix * vec4f(input[index], 0, 1);
        //将 ndc 坐标系下的 point 坐标转换为屏幕空间的像素坐标，其中像素坐标的原点位于屏幕的左下方
        let pc = (point.xy / point.w + vec2f(1, 1)) / 2.0f * resolution ;

        //遍历 point 像素半径覆盖的各个像素
        let r = i32(radius);
        let w = i32(resolution.x);
        let h = i32(resolution.y);
        let si = max(0, i32(pc.x) - r);
        let ei = min(w, i32(pc.x) + r);
        let sj = max(0, i32(pc.y) - r);
        let ej = min(h, i32(pc.y) + r);
        for(var i = si; i <= ei; i++){
            for(var j = sj; j <= ej; j++){
                let d = pow(pow(f32(i) - pc.x, 2) + pow(f32(j) - pc.y, 2), 0.5);
                var h = step(d / radius, 1) * (1 - d / radius);
                h = pow(h, 1.5);
                let outIdx = u32(j) * u32(resolution.x) + u32(i);
                let v = u32(step(0, h) * h * prec);
                atomicAdd(&output[outIdx], v);
            }
        }
    }
`

const renderShaderCode = `
    @group(0) @binding(0) var<storage, read> heatmap: array<u32>;
    @group(0) @binding(1) var<uniform> maxHeatValue: f32;
    @group(0) @binding(2) var<uniform> resolution: vec2f;
    //color.a 为 颜色插值时对应的 offset 取值范围为0到1
    @group(0) @binding(3) var<uniform> colors: array<vec4f, 5>;

    fn fade(low: f32, mid: f32, high: f32, value: f32, ) -> f32 {
        let rl = abs(mid - low);
        let rr = abs(mid - high);
        var vl = (mid - value) / rl;
        vl = step(0, vl) * vl;
        var vr = (value - mid) / rr;
        vr = step(0, vr) * vr;

        return 1 - clamp(vl + vr, 0, 1);
    }

    fn interpColor(heatValue: f32) -> vec4f {
        if(heatValue > 1){
            return vec4f(colors[0].rgb, 1);
        }
        if(heatValue < 0){
            return vec4f(colors[4].rgb, 1);
        }
        var color = vec3f(0, 0, 0);
        for(var i = 0;  i < 5; i++){
            color += fade(
                select(colors[i + 1].a, colors[4].a - colors[3].a, i == 4),
                colors[i].a,
                select(colors[i - 1].a, colors[0].a + colors[1].a, i == 0),
                heatValue
            ) * colors[i].rgb;
        }
        return vec4f(color, 1);
    }

    @vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
        let positions = array(
            vec2f(-1, -1),
            vec2f(1, 1),
            vec2f(-1, 1),
            vec2f(-1, -1),
            vec2f(1, -1),
            vec2f(1, 1),
        );

        return vec4f(positions[vi], 0, 1);
    }

    @fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f{
        let index = u32(resolution.y - pos.y) * u32(resolution.x) + u32(pos.x);
        var val = f32(heatmap[index]) / maxHeatValue / 10000f;
        if(val == 0){
            discard;
        }
        let color = interpColor(val);
        return color * val;
        // return vec4f(val, 0, 0, 1);
    }
`

class HeatmapMaterial extends Material {
	private actualMaxHeatValue: number
	private maxHeatValue: number | ((maxValue: number) => number)
	private radius = 25
	private points = new Float32Array([])
	private colorList: Float32Array
	private offsetList: Float32Array

	constructor(props: IProps) {
		super({
			shaderCode: renderShaderCode,
			blending: 'normalBlending'
		})
		this.colorList = props.colorList
			? new Float32Array(props.colorList.flat())
			: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
		this.offsetList = props.offsets ? new Float32Array(props.offsets) : new Float32Array([1, 0.85, 0.55, 0.35, 0])
		this.maxHeatValue = props.maxHeatValue || 1
		this.maxHeatValue = typeof props.maxHeatValue === 'number' ? props.maxHeatValue : 1
		this.points = props.points
		this.radius = props.radius || 15
		this.updateUniform('maxHeatValue', this.maxHeatValue)
		this.updateUniform('colors', this.colorOffsets)
	}

	get colorOffsets() {
		const res = new Float32Array(4 * 4)
		for (let i = 0; i < 4; ++i) {
			res[i * 4 + 0] = this.colorList[i * 3 + 0]
			res[i * 4 + 1] = this.colorList[i * 3 + 1]
			res[i * 4 + 2] = this.colorList[i * 3 + 2]
			res[i * 4 + 3] = this.offsetList[i]
		}
		return res
	}

	public recordComputeCommand(renderer: Renderer, encoder: GPUCommandEncoder) {
		const device = renderer.device
		const num = this.points.length / 2
		const computeShaderModule = device.createShaderModule({
			label: 'compute shader demo',
			code: computeShaderCode
		})

		const pipeline = device.createComputePipeline({
			label: 'compute pipeline demo',
			layout: 'auto',
			compute: {
				module: computeShaderModule,
				entryPoint: 'main'
			}
		})

		const uniformUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		const radiusValue = new Float32Array([this.radius])
		const radiusBuffer = device.createBuffer({
			label: 'Radius Uniforms',
			size: radiusValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(radiusBuffer, 0, radiusValue)

		const countX = Math.ceil(num ** 0.5)
		const countY = Math.ceil(num / countX)
		const gridValue = new Uint32Array([countX, countY])
		const gridBuffer = device.createBuffer({
			label: 'Grid Uniforms',
			size: gridValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(gridBuffer, 0, gridValue)

		const resolution = [renderer.width, renderer.height]
		const resolutionValue = new Float32Array(resolution)
		const resolutionBuffer = device.createBuffer({
			label: 'Resolution Uniforms',
			size: resolutionValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(resolutionBuffer, 0, resolutionValue)

		const inputBuffer = device.createBuffer({
			label: 'input storage buffer',
			size: this.points.byteLength,
			usage: storageUsage
		})
		device.queue.writeBuffer(inputBuffer, 0, this.points)

		const outputBuffer = device.createBuffer({
			label: 'output storage buffer',
			size: resolution[0] * resolution[1] * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
		})
		this.replaceStorageBuffer('heatmap', outputBuffer)

		const readBuffer = device.createBuffer({
			label: 'unmaped buffer',
			size: outputBuffer.size,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
		})

		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: inputBuffer } },
				{ binding: 1, resource: { buffer: outputBuffer } },
				{ binding: 2, resource: { buffer: gridBuffer } },
				{ binding: 3, resource: { buffer: resolutionBuffer } },
				{ binding: 4, resource: { buffer: radiusBuffer } },
				{ binding: 5, resource: { buffer: renderer.precreatedUniformBuffers['projectionMatrix'] } },
				{ binding: 6, resource: { buffer: renderer.precreatedUniformBuffers['viewMatrix'] } }
			]
		})

		const computePass = encoder.beginComputePass()
		computePass.setPipeline(pipeline)
		computePass.setBindGroup(0, bindGroup)

		computePass.dispatchWorkgroups(countX, countY)
		computePass.end()

		encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, readBuffer.size)

		readBuffer.mapAsync(GPUMapMode.READ).then(() => {
			const data = new Uint32Array(readBuffer.getMappedRange())
			let maxValue = -Infinity
			for (let i = 0; i < data.length; ++i) {
				if (maxValue < data[i]) maxValue = data[i]
			}
			console.log(maxValue)
			readBuffer.unmap()
		})
	}
}

export default HeatmapMaterial
