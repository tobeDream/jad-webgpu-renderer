export async function main(canvas: HTMLCanvasElement) {
	// canvas.width = 32
	// canvas.height = 32
	const adapter = await navigator.gpu?.requestAdapter()
	const device = await adapter?.requestDevice()
	if (!device) {
		throw 'need a browser that supports WebGPU'
	}

	const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
	const ctx = canvas.getContext('webgpu')
	if (!ctx) return
	ctx.configure({
		device,
		format: presentationFormat
	})

	const code = `
		@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
			let pos = array(
				vec2f(-1.0, 1.0),
				vec2f(-1.0, -1.0),
				vec2f(1.0, -1.0),
				vec2f(1.0, -1.0),
				vec2f(1.0, 1.0),
				vec2f(-1.0, 1.0)
			);

			let p = vec4f(pos[vi], 0, 1);
			return p;
		}

		@fragment fn fs() -> @location(0) vec4<u32> {
			return vec4<u32>(123, 1, 1, 1);
		}
	`
	const module = device.createShaderModule({
		label: 'triangle vertex shader with uniforms',
		code
	})

	const texture = device.createTexture({
		size: [canvas.width, canvas.height, 1],
		format: 'rgba32uint',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	})

	const pipeline = device.createRenderPipeline({
		label: 'triangle with uniforms',
		layout: 'auto',
		vertex: {
			module,
			entryPoint: 'vs'
		},
		fragment: {
			module,
			entryPoint: 'fs',
			targets: [{ format: 'rgba32uint' }]
		}
	})
	console.log(presentationFormat)

	const renderPassDescriptor: GPURenderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				view: texture.createView(),
				clearValue: [0.3, 0.3, 0.3, 1],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const bytesPerRow = Math.ceil((canvas.width * 4 * 4) / 256) * 256
	const readBuffer = device.createBuffer({
		size: bytesPerRow * canvas.height,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
	})

	async function render() {
		if (!device || !ctx) return

		//@ts-ignore
		renderPassDescriptor.colorAttachments[0].view = texture.createView()
		const encoder = device.createCommandEncoder({ label: 'our encoder' })

		const pass = encoder.beginRenderPass(renderPassDescriptor)
		pass.setPipeline(pipeline)
		pass.draw(6)
		pass.end()

		encoder.copyTextureToBuffer(
			{ texture },
			{
				buffer: readBuffer,
				bytesPerRow
			},
			[canvas.width, canvas.height, 1]
		)
		const commandBuffer = encoder.finish()
		device.queue.submit([commandBuffer])

		await readBuffer.mapAsync(GPUMapMode.READ)
		const arrayBuffer = readBuffer.getMappedRange()
		const data = new Uint32Array(arrayBuffer)
		console.log(data)
	}

	render()
	// const observer = new ResizeObserver((entries) => {
	// 	for (const entry of entries) {
	// 		canvas.width = canvas.offsetWidth
	// 		canvas.height = canvas.offsetHeight
	// 		render()
	// 	}
	// })
	// observer.observe(canvas)
}

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

main(canvas)
