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

			let p = vec4f(pos[vi % 6], 0, 1);
			return p;
		}

		@fragment fn fs() -> @location(0) vec4f {
			return vec4f(0.25, 0, 0, 1);
		}
	`

	const deferredRenderCode = `
		@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
			let pos = array(
				vec2f(-1.0, 1.0),
				vec2f(-1.0, -1.0),
				vec2f(1.0, -1.0),
				vec2f(1.0, -1.0),
				vec2f(1.0, 1.0),
				vec2f(-1.0, 1.0)
			);

			let p = vec4f(pos[vi % 6], 0, 1);
			return p;
		}

		@group(0) @binding(0) var tex: texture_2d<f32>;
		@fragment fn fs(@builtin(position) coord: vec4f) ->  @location(0) vec4f {
			let color = textureLoad(tex, vec2i(floor(coord.xy)), 0);
			return color;
			// return vec4f(color.g, 0, 0, 1);
		}
	`

	const module = device.createShaderModule({
		label: 'triangle vertex shader with uniforms',
		code
	})

	const deferredModule = device.createShaderModule({
		label: 'deferred render module',
		code: deferredRenderCode
	})

	const texture = device.createTexture({
		size: [canvas.width, canvas.height, 1],
		format: 'rgba16float',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
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
			targets: [
				{
					format: 'rgba16float',
					blend: {
						color: {
							srcFactor: 'one',
							dstFactor: 'one'
						},
						alpha: {
							srcFactor: 'one',
							dstFactor: 'one'
						}
					}
				}
			]
		}
	})

	const deferredPipeline = device.createRenderPipeline({
		label: 'deferred pipeline',
		layout: device.createPipelineLayout({
			bindGroupLayouts: [
				device.createBindGroupLayout({
					entries: [
						{
							binding: 0,
							visibility: GPUShaderStage.FRAGMENT,
							texture: {
								sampleType: 'unfilterable-float'
							}
						}
					]
				})
			]
		}),
		vertex: {
			module: deferredModule,
			entryPoint: 'vs'
		},
		fragment: {
			module: deferredModule,
			entryPoint: 'fs',
			targets: [
				{
					format: presentationFormat
				}
			]
		}
	})

	const renderPassDescriptor: GPURenderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				view: texture.createView(),
				clearValue: [0, 0, 0, 0],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const deferredRenderPassDescriptor: GPURenderPassDescriptor = {
		label: 'deferred render pass desc',
		colorAttachments: [
			{
				view: ctx.getCurrentTexture().createView(),
				clearValue: [0, 0, 0, 1],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const bindGroup = device.createBindGroup({
		layout: deferredPipeline.getBindGroupLayout(0),
		entries: [
			{
				binding: 0,
				resource: texture.createView()
			}
		]
	})

	// const bytesPerRow = Math.ceil((canvas.width * 4 * 2) / 256) * 256
	// const readBuffer = device.createBuffer({
	// 	size: bytesPerRow * canvas.height,
	// 	usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
	// })

	async function render() {
		if (!device || !ctx) return

		//@ts-ignore
		renderPassDescriptor.colorAttachments[0].view = texture.createView()
		const encoder = device.createCommandEncoder({ label: 'our encoder' })

		const pass = encoder.beginRenderPass(renderPassDescriptor)
		pass.setPipeline(pipeline)
		pass.draw(24)
		pass.end()

		const deferredPass = encoder.beginRenderPass(deferredRenderPassDescriptor)
		deferredPass.setPipeline(deferredPipeline)
		deferredPass.setBindGroup(0, bindGroup)
		deferredPass.draw(6)
		deferredPass.end()

		// encoder.copyTextureToBuffer(
		// 	{ texture },
		// 	{
		// 		buffer: readBuffer,
		// 		bytesPerRow
		// 	},
		// 	[canvas.width, canvas.height, 1]
		// )
		const commandBuffer = encoder.finish()
		device.queue.submit([commandBuffer])

		// await readBuffer.mapAsync(GPUMapMode.READ)
		// const arrayBuffer = readBuffer.getMappedRange()
		// const data = new Uint16Array(arrayBuffer)
		// console.log(data)
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
