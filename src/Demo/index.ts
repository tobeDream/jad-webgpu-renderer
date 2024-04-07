import { PositionalAudio } from 'three'

async function main() {
	const canvas = document.querySelector('#canvas') as HTMLCanvasElement
	canvas.width = canvas.offsetWidth
	canvas.height = canvas.offsetHeight

	const ctx = canvas.getContext('webgpu') || null
	if (!ctx) return
	const adapter = await navigator.gpu.requestAdapter()
	const device = await adapter?.requestDevice({
		requiredLimits: {
			maxBufferSize: 800 * 1024 * 1024
		}
	})
	if (!device) return

	const num = 10000
	const radius = 10
	const points = new Float32Array(num * 2)

	for (let i = 0; i < num; ++i) {
		points[i * 2] = Math.random() * 2 - 1
		points[i * 2 + 1] = Math.random() * 2 - 1
	}

	const shaderModule = device.createShaderModule({
		label: 'compute shader demo',
		code: `
			@group(0) @binding(0) var<storage> input: array<f32>;
			@group(0) @binding(1) var<storage, read_write> output: array<f32>;
			@group(0) @binding(2) var<uniform> grid: vec2u;
			@group(0) @binding(3) var<uniform> resolution: vec2f;
			@group(0) @binding(4) var<uniform> radius: f32;

			fn getIndex(id: vec2u) -> u32 {
				return (id.y % grid.y) * grid.x + (id.x % grid.x);
			}

			@compute @workgroup_size(8, 8, 1)
			fn main(@builtin(global_invocation_id) id: vec3u){
				let index = getIndex(id.xy);
				let point = input[index];
				//将 ndc 坐标系下的 point 坐标转换为屏幕空间的像素坐标，其中像素坐标的原点位于屏幕的左下方
				let pc = (point + vec2f(1, 1)) / 2.0f * resolution;

				//遍历 point 像素半径覆盖的各个像素
				for(var i = i32(-radius); i <= i32(radius); i++){
					for(var j = i32(-radius); j <= i32(radius); j++){
						var x = (f32(i) + pc.x) % resolution.x;
						var y = (f32(j) + pc.y) % resolution.y;
						x = step(0, x) * x;
						y = step(0, y) * y;
						let d = pow(pow(x, 2f) + pow(y, 2f), 0.5);
						let v = step(d, f32(radius)) * d;
						let outIdx = u32(y * resolution.x + x);
						storageBarrier();
						let old = output[outIdx];
						output[outIdx] += v;
						storageBarrier();
					}
				}
			}
		`
	})

	const pipeline = device.createComputePipeline({
		label: 'compute pipeline demo',
		layout: 'auto',
		compute: {
			module: shaderModule,
			entryPoint: 'main'
		}
	})

	const radiusValue = new Float32Array([radius])
	const radiusBuffer = device.createBuffer({
		label: 'Radius Uniforms',
		size: radiusValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})

	const grid = Math.ceil(num ** 0.5)
	const gridValue = new Uint32Array([grid, grid])
	const gridBuffer = device.createBuffer({
		label: 'Grid Uniforms',
		size: gridValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(gridBuffer, 0, gridValue)

	const resolutionValue = new Float32Array([canvas.width, canvas.height])
	const resolutionBuffer = device.createBuffer({
		label: 'Resolution Uniforms',
		size: resolutionValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(resolutionBuffer, 0, resolutionValue)

	const inputBuffer = device.createBuffer({
		label: 'input storage buffer',
		size: points.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(inputBuffer, 0, points)

	const outputBuffer = device.createBuffer({
		label: 'output storage buffer',
		size: canvas.width * canvas.height * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
	})

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
			{ binding: 4, resource: { buffer: radiusBuffer } }
		]
	})

	const encoder = device.createCommandEncoder()
	const computePass = encoder.beginComputePass()
	computePass.setPipeline(pipeline)
	computePass.setBindGroup(0, bindGroup)
	computePass.dispatchWorkgroups(Math.ceil(grid / 8), Math.ceil(grid / 8))
	computePass.end()

	const commandBuffer = encoder.finish()
	device.queue.submit([commandBuffer])
}

main()
