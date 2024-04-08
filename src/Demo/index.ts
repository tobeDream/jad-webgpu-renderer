async function main() {
	const canvas = document.querySelector('#canvas') as HTMLCanvasElement
	canvas.width = canvas.offsetWidth / 32
	canvas.height = canvas.offsetHeight / 32

	console.log(canvas.width, canvas.height)

	const ctx = canvas.getContext('webgpu') || null
	if (!ctx) return
	const adapter = await navigator.gpu.requestAdapter()
	const device = await adapter?.requestDevice({
		requiredLimits: {
			maxBufferSize: 800 * 1024 * 1024
		}
	})
	if (!device) return

	const num = 2
	const radius = 3
	const points = new Float32Array(num * 2)

	points[0] = -0.99
	points[1] = 0
	points[2] = 0.99
	points[3] = 0
	// for (let i = 0; i < num; ++i) {
	// 	points[i * 2] = Math.random() * 2 - 1
	// 	points[i * 2 + 1] = Math.random() * 2 - 1
	// }

	const shaderModule = device.createShaderModule({
		label: 'compute shader demo',
		code: `
			@group(0) @binding(0) var<storage> input: array<vec2f>;
			@group(0) @binding(1) var<storage, read_write> output_x: array<atomic<u32>>;
			@group(0) @binding(2) var<uniform> grid: vec2u;
			@group(0) @binding(3) var<uniform> resolution: vec2f;
			@group(0) @binding(4) var<uniform> radius: f32;
			@group(0) @binding(5) var<storage, read_write> output_y: array<atomic<u32>>;

			fn getIndex(id: vec2u) -> u32 {
				return (id.y % grid.y) * grid.x + (id.x % grid.x);
			}

			@compute @workgroup_size(1, 1, 1)
			fn main(@builtin(global_invocation_id) id: vec3u){
				let index = getIndex(id.xy);
				// if(index >= arrayLength(&input) / 2){
				// 	return;
				// }
				let point = input[index];
				//将 ndc 坐标系下的 point 坐标转换为屏幕空间的像素坐标，其中像素坐标的原点位于屏幕的左下方
				let pc = (point + vec2f(1, 1)) / 2.0f * resolution;

				_ = radius;
				atomicStore(&output_x[index], u32(pc.x));
				atomicStore(&output_y[index], u32(pc.y));

				//遍历 point 像素半径覆盖的各个像素
				// let r = i32(radius);
				// let r2 = pow(radius, 2f);
				// for(var i = -r; i <= r; i++){
				// 	for(var j = -r; j <= r; j++){
				// 		var xx = (f32(i) + pc.x) % resolution.x;
				// 		var yy = (f32(j) + pc.y) % resolution.y;
				// 		let x = u32(step(0, xx) * xx);
				// 		let y = u32(step(0, yy) * yy);
				// 		let d = pow(f32(i), 2) + pow(f32(j), 2);
				// 		let v = u32(step(d, r2)) * vec2u(u32(r - abs(i)), u32(r - abs(j)));
				// 		// let v = step(0, 1 - d / radius) * (1 - d / radius);
				// 		let outIdx = y * u32(resolution.x) + x;
				// 		atomicAdd(&output_x[outIdx], v.x);
				// 		atomicAdd(&output_y[outIdx], v.y);
				// 	}
				// }
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
	device.queue.writeBuffer(radiusBuffer, 0, radiusValue)

	const countX = Math.ceil(num ** 0.5)
	const countY = Math.ceil(num / countX)
	console.log(countX, countY, num)
	const gridValue = new Uint32Array([countX, countY])
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

	const outputBufferX = device.createBuffer({
		label: 'output storage buffer',
		size: canvas.width * canvas.height * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
	})

	const readBufferX = device.createBuffer({
		label: 'unmaped buffer',
		size: outputBufferX.size,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	})

	const outputBufferY = device.createBuffer({
		label: 'output storage buffer',
		size: canvas.width * canvas.height * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
	})

	const readBufferY = device.createBuffer({
		label: 'unmaped buffer',
		size: outputBufferX.size,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	})

	const bindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: { buffer: inputBuffer } },
			{ binding: 1, resource: { buffer: outputBufferX } },
			{ binding: 2, resource: { buffer: gridBuffer } },
			{ binding: 3, resource: { buffer: resolutionBuffer } },
			{ binding: 4, resource: { buffer: radiusBuffer } },
			{ binding: 5, resource: { buffer: outputBufferY } }
		]
	})

	const encoder = device.createCommandEncoder()
	const computePass = encoder.beginComputePass()
	computePass.setPipeline(pipeline)
	computePass.setBindGroup(0, bindGroup)

	computePass.dispatchWorkgroups(countX, countY)
	computePass.end()
	encoder.copyBufferToBuffer(outputBufferX, 0, readBufferX, 0, readBufferX.size)
	encoder.copyBufferToBuffer(outputBufferY, 0, readBufferY, 0, readBufferY.size)
	const commandBuffer = encoder.finish()
	device.queue.submit([commandBuffer])

	await readBufferX.mapAsync(GPUMapMode.READ)
	await readBufferY.mapAsync(GPUMapMode.READ)
	const data = new Uint32Array(readBufferX.getMappedRange())
	const data1 = new Uint32Array(readBufferY.getMappedRange())
	let count = 0
	for (let i = 0; i < data.length; ++i) {
		if (data[i] !== 0) {
			count++
			console.log(i, i % canvas.width, (i / canvas.width) | 0, data[i], data1[i])
		}
	}
	console.log(data)
	console.log(data1)
	console.log('count: ' + count)
}

main()
