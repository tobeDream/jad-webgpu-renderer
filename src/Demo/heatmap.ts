import { makeShaderDataDefinitions } from 'webgpu-utils'

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

	const num = 10000000
	const radius = 20
	const points = new Float32Array(num * 2)

	points[0] = 0
	points[1] = 0
	points[2] = 0.5
	points[3] = 0.5
	for (let i = 2; i < num; ++i) {
		points[i * 2] = Math.random() * 2 - 1
		points[i * 2 + 1] = Math.random() * 2 - 1
	}

	const s = new Date().valueOf()

	const heatShaderModule = device.createShaderModule({
		label: 'heat shader module',
		code: `
			struct Vertex {
				@builtin(vertex_index) vi: u32,
				@location(0) position: vec2f,
			};

			struct VSOutput {
				@builtin(position) position: vec4f,
				@location(0) pointCoord: vec2f,
			};

			@group(0) @binding(0) var<uniform> resolution: vec2f;
			@group(0) @binding(1) var<uniform> size: f32;

			@vertex fn vs(vert: Vertex) ->  VSOutput{
				let points = array(
					vec2f(-1, -1),
					vec2f( 1, -1),
					vec2f(-1,  1),
					vec2f(-1,  1),
					vec2f( 1, -1),
					vec2f( 1,  1),
				);

        		let pos = points[vert.vi];
				let pointPos = pos * size / resolution;

        		var vsOut: VSOutput;
				vsOut.position = vec4f(vert.position + pointPos, 0, 1);
				vsOut.pointCoord = pos;

				return vsOut;
			}

			@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
				let coord = vsOut.pointCoord;
				let dis = length(coord);
				if(dis >= 1) {
					discard;
				}
				let h = pow(1.0 - dis, 1.5) / 100;
				return vec4f(h, 0, 0, 0);
			}
		`
	})

	const heatPipeline = device.createRenderPipeline({
		label: 'heat pipeline',
		layout: 'auto',
		vertex: {
			module: heatShaderModule,
			entryPoint: 'vs',
			buffers: [
				{
					arrayStride: 4 * 2,
					stepMode: 'instance',
					attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
				}
			]
		},
		fragment: {
			module: heatShaderModule,
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

	const vertexBuffer = device.createBuffer({
		label: 'points buffer',
		size: points.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(vertexBuffer, 0, points)

	const resolutionValue = new Float32Array([canvas.width, canvas.height])
	const resolutionBuffer = device.createBuffer({
		label: 'Resolution Uniforms',
		size: resolutionValue.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(resolutionBuffer, 0, resolutionValue)

	const sizeVal = new Float32Array([radius])
	const sizeBuffer = device.createBuffer({
		size: sizeVal.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(sizeBuffer, 0, sizeVal)
	const bindGroup = device.createBindGroup({
		layout: heatPipeline.getBindGroupLayout(0),
		entries: [
			{
				binding: 0,
				resource: { buffer: resolutionBuffer }
			},
			{
				binding: 1,
				resource: { buffer: sizeBuffer }
			}
		]
	})

	const texture = device.createTexture({
		size: [canvas.width, canvas.height, 1],
		format: 'rgba16float',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
	})

	const heatRenderPassDesc: GPURenderPassDescriptor = {
		label: 'heat renderPass',
		colorAttachments: [
			{
				view: texture.createView(),
				clearValue: [0, 0, 0, 0],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const maxHeatCode = `
		@group(0) @binding(0) var tex: texture_2d<f32>;
		@group(0) @binding(1) var<uniform> resolution: vec2f;

		struct VSOut {
			@location(0) vi: f32,
			@builtin(position) position: vec4f
		}

		@vertex fn vs(@builtin(vertex_index) vii: u32) -> VSOut {
			var vsOut: VSOut;
			vsOut.vi = f32(vii);
			vsOut.position = vec4f(0, 0, 0, 1);
			return vsOut;
		}

		@fragment fn fs(vsOut: VSOut) -> @location(0) vec4f {
			let vi = i32(vsOut.vi);
			let y = vi / i32(resolution.x);
			let x = vi - i32(resolution.x) * y;
			let color = textureLoad(tex, vec2i(x, y), 0);
			return color;
		}
	`

	const maxHeatModule = device.createShaderModule({
		code: maxHeatCode
	})

	const maxValueTex = device.createTexture({
		size: [1, 1, 1],
		format: 'rgba16float',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
	})

	const maxHeatPipeline = device.createRenderPipeline({
		label: 'max heat pipeline',
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
						},
						{
							binding: 1,
							visibility: GPUShaderStage.FRAGMENT,
							buffer: {
								type: 'uniform'
							}
						}
					]
				})
			]
		}),
		vertex: {
			module: maxHeatModule,
			entryPoint: 'vs'
		},
		fragment: {
			module: maxHeatModule,
			entryPoint: 'fs',
			targets: [
				{
					format: 'rgba16float',
					blend: {
						color: {
							srcFactor: 'one',
							dstFactor: 'one',
							operation: 'max'
						},
						alpha: {
							srcFactor: 'one',
							dstFactor: 'one',
							operation: 'max'
						}
					}
				}
			]
		},
		primitive: { topology: 'point-list' }
	})

	const maxHeatRenderPassDesc: GPURenderPassDescriptor = {
		label: 'max heat renderPass',
		colorAttachments: [
			{
				view: maxValueTex.createView(),
				clearValue: [0, 0, 0, 0],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	const maxHeatBindGroup = device.createBindGroup({
		layout: maxHeatPipeline.getBindGroupLayout(0),
		entries: [
			{
				binding: 0,
				resource: texture.createView()
			},
			{
				binding: 1,
				resource: { buffer: resolutionBuffer }
			}
		]
	})

	const readBuffer = device.createBuffer({
		label: 'read buffer',
		size: 4 * 2 * 1,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	})

	const renderCode = `
			@group(0) @binding(0) var tex: texture_2d<f32>;
			@group(0) @binding(1) var<uniform> colors: array<vec4f, 5>;
			@group(0) @binding(2) var maxValTex: texture_2d<f32>;

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

		@fragment fn fs(@builtin(position) coord: vec4f) ->  @location(0) vec4f {
			var heatValue = textureLoad(tex, vec2i(floor(coord.xy)), 0).r;
			if(heatValue == 0){
				discard;
			}
			let maxHeatValue = textureLoad(maxValTex, vec2i(0, 0), 0).r;
			heatValue = clamp(heatValue / maxHeatValue, 0, 1);
			let color = interpColor(heatValue) * heatValue;

			return color;
		}
	`

	console.log(makeShaderDataDefinitions(renderCode))

	const renderModule = device.createShaderModule({
		label: 'deferred render module',
		code: renderCode
	})

	const renderPipeline = device.createRenderPipeline({
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
						},
						{
							binding: 1,
							visibility: GPUShaderStage.FRAGMENT,
							buffer: {
								type: 'uniform'
							}
						},
						{
							binding: 2,
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
			module: renderModule,
			entryPoint: 'vs'
		},
		fragment: {
			module: renderModule,
			entryPoint: 'fs',
			targets: [
				{
					format: presentationFormat
				}
			]
		}
	})

	const renderPassDescriptor: GPURenderPassDescriptor = {
		label: 'deferred render pass desc',
		colorAttachments: [
			{
				view: context.getCurrentTexture().createView(),
				clearValue: [0, 0, 0, 1],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

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
				resource: texture.createView()
			},
			{
				binding: 1,
				resource: { buffer: colorListBuffer }
			},
			{
				binding: 2,
				resource: maxValueTex.createView()
			}
		]
	})

	const encoder = device.createCommandEncoder()
	const renderPass = encoder.beginRenderPass(heatRenderPassDesc)
	renderPass.setPipeline(heatPipeline)
	renderPass.setVertexBuffer(0, vertexBuffer)
	renderPass.setBindGroup(0, bindGroup)
	renderPass.draw(6, num)
	renderPass.end()

	const maxHeatRenderPass = encoder.beginRenderPass(maxHeatRenderPassDesc)
	maxHeatRenderPass.setPipeline(maxHeatPipeline)
	maxHeatRenderPass.setBindGroup(0, maxHeatBindGroup)
	maxHeatRenderPass.draw(canvas.width * canvas.height)
	maxHeatRenderPass.end()

	const renderPass1 = encoder.beginRenderPass(renderPassDescriptor)
	renderPass1.setPipeline(renderPipeline)
	renderPass1.setBindGroup(0, renderBindGroup)
	renderPass1.draw(6)
	renderPass1.end()

	const commandBuffer = encoder.finish()
	device.queue.submit([commandBuffer])
	// await readBuffer.mapAsync(GPUMapMode.READ)
	// const data = new Float32Array(readBuffer.getMappedRange())
	// console.log(data)
	await device.queue.onSubmittedWorkDone()
	console.log(new Date().valueOf() - s)
}

main()
