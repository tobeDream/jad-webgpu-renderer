async function computeHeatValues(
	device: GPUDevice,
	points: Float32Array,
	radius: number,
	resolution: [number, number]
) {
	const num = points.length / 2
	const computeShaderModule = device.createShaderModule({
		label: 'compute shader demo',
		code: `
			const prec = 10000f;
			@group(0) @binding(0) var<storage> input: array<vec2f>;
			@group(0) @binding(1) var<storage, read_write> output: array<atomic<u32>>;
			@group(0) @binding(2) var<uniform> grid: vec2u;
			@group(0) @binding(3) var<uniform> resolution: vec2f;
			@group(0) @binding(4) var<uniform> radius: f32;

			fn getIndex(id: vec2u) -> u32 {
				return (id.y % grid.y) * grid.x + (id.x % grid.x);
			}

			@compute @workgroup_size(1, 1, 1)
			fn main(@builtin(global_invocation_id) id: vec3u){
				let index = getIndex(id.xy);
				if(index >= arrayLength(&input)){
					return;
				}
				let point = input[index];
				//将 ndc 坐标系下的 point 坐标转换为屏幕空间的像素坐标，其中像素坐标的原点位于屏幕的左下方
				let pc = (point + vec2f(1, 1)) / 2.0f * resolution;

				// _ = radius;
				// atomicStore(&output_x[index], u32(pc.x));

				//遍历 point 像素半径覆盖的各个像素
				let r = i32(radius);
				for(var i = -r; i <= r; i++){
					for(var j = -r; j <= r; j++){
						var xx = (f32(i) + pc.x) % resolution.x;
						var yy = (f32(j) + pc.y) % resolution.y;
						let x = u32(step(0, xx) * xx);
						let y = u32(step(0, yy) * yy);
						let d = pow(pow(f32(i), 2) + pow(f32(j), 2), 0.5);
						var h = step(d / radius, 1) * (1 - d / radius);
						h = pow(h, 1.5);
						let outIdx = y * u32(resolution.x) + x;
						let v = u32(step(0, h) * h * prec);
						atomicAdd(&output[outIdx], v);
					}
				}
			}
		`
	})

	const pipeline = device.createComputePipeline({
		label: 'compute pipeline demo',
		layout: 'auto',
		compute: {
			module: computeShaderModule,
			entryPoint: 'main'
		}
	})

	const radiusValue = new Float32Array([radius])
	const radiusBuffer = device.createBuffer({
		label: 'Radius Uniforms',
		size: radiusValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(radiusBuffer, 0, radiusValue)

	const countX = Math.ceil(num ** 0.5)
	const countY = Math.ceil(num / countX)
	const gridValue = new Uint32Array([countX, countY])
	const gridBuffer = device.createBuffer({
		label: 'Grid Uniforms',
		size: gridValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(gridBuffer, 0, gridValue)

	const resolutionValue = new Float32Array(resolution)
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
		size: resolution[0] * resolution[1] * 4,
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

	computePass.dispatchWorkgroups(countX, countY)
	computePass.end()

	encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, readBuffer.size)

	const commandBuffer = encoder.finish()
	device.queue.submit([commandBuffer])

	await readBuffer.mapAsync(GPUMapMode.READ)
	const data = new Uint32Array(readBuffer.getMappedRange())
	let maxValue = -Infinity
	for (let i = 0; i < data.length; ++i) {
		if (maxValue < data[i]) maxValue = data[i]
	}
	readBuffer.unmap()
	return { maxHeatValue: maxValue / 10000, buffer: outputBuffer }
}

async function main() {
	const canvas = document.querySelector('#canvas') as HTMLCanvasElement
	canvas.width = canvas.offsetWidth / 1
	canvas.height = canvas.offsetHeight / 1

	console.log(canvas.width, canvas.height)

	const context = canvas.getContext('webgpu') || null
	if (!context) return
	const adapter = await navigator.gpu.requestAdapter()
	const device = await adapter?.requestDevice({
		requiredLimits: {
			maxBufferSize: 800 * 1024 * 1024
		}
	})
	if (!device) return

	const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
	context.configure({
		device,
		format: presentationFormat,
		alphaMode: 'premultiplied'
	})

	const num = 1
	const radius = 25
	const points = new Float32Array(num * 2)

	points[0] = 0
	points[1] = 0.99
	points[2] = 0.5
	points[3] = 0
	for (let i = 2; i < num; ++i) {
		points[i * 2] = Math.random() * 2 - 1
		points[i * 2 + 1] = Math.random() * 2 - 1
	}
	console.log(points)

	const { maxHeatValue, buffer } = await computeHeatValues(device, points, radius, [canvas.width, canvas.height])
	console.log(maxHeatValue)

	//render pipeline
	const shaderModule = device.createShaderModule({
		label: 'render shader module',
		code: `
			@group(0) @binding(0) var<storage, read> heatmap: array<u32>;
			@group(0) @binding(1) var<uniform> max_heat_value: f32;
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
				let index = u32(pos.y) * u32(resolution.x) + u32(pos.x);
				var val = f32(heatmap[index]) / max_heat_value / 10000f;
				if(val == 0){
					discard;
				}
				let color = interpColor(val);
				// return color * val;
				return vec4f(val, 0, 0, 1);
			}
		`
	})

	const renderPipeline = device.createRenderPipeline({
		label: 'hardcoded checkerboard triangle pipeline',
		layout: 'auto',
		vertex: {
			module: shaderModule,
			entryPoint: 'vs'
		},
		fragment: {
			module: shaderModule,
			entryPoint: 'fs',
			targets: [
				{
					format: presentationFormat,
					blend: {
						color: {
							srcFactor: 'one',
							dstFactor: 'one-minus-src-alpha'
						},
						alpha: {
							srcFactor: 'one',
							dstFactor: 'one-minus-src-alpha'
						}
					}
				}
			]
		}
	})

	const renderPassDescriptor: GPURenderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				view: context.getCurrentTexture().createView(),
				clearValue: [0.3, 0.3, 0.3, 1],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const maxHeatValueArr = new Float32Array([2])
	const maxHeatValueBuffer = device.createBuffer({
		label: 'max heat value buffer',
		size: maxHeatValueArr.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(maxHeatValueBuffer, 0, maxHeatValueArr)

	const resolutionValue = new Float32Array([canvas.width, canvas.height])
	const resolutionBuffer = device.createBuffer({
		label: 'Resolution Uniforms',
		size: resolutionValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(resolutionBuffer, 0, resolutionValue)

	const colorList = new Float32Array([1, 0, 0, 1, 1, 1, 0, 0.85, 0, 1, 0, 0.55, 0, 0, 1, 0.35, 0, 0, 0, 0])
	const colorListBuffer = device.createBuffer({
		label: 'color list buffer',
		size: colorList.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(colorListBuffer, 0, colorList)

	const renderBindGroup = device.createBindGroup({
		layout: renderPipeline.getBindGroupLayout(0),
		entries: [
			{
				binding: 0,
				resource: { buffer }
			},
			{
				binding: 1,
				resource: { buffer: maxHeatValueBuffer }
			},
			{
				binding: 2,
				resource: { buffer: resolutionBuffer }
			},
			{
				binding: 3,
				resource: { buffer: colorListBuffer }
			}
		]
	})

	const encoder = device.createCommandEncoder()
	const renderPass = encoder.beginRenderPass(renderPassDescriptor)
	renderPass.setPipeline(renderPipeline)
	renderPass.setBindGroup(0, renderBindGroup)
	renderPass.draw(6)
	renderPass.end()

	const commandBuffer = encoder.finish()
	device.queue.submit([commandBuffer])
}

main()
