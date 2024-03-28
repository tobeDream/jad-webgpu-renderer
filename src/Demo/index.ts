//code from webgpu-fundamentals
import { Matrix3, Matrix4, PerspectiveCamera } from 'three'
import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils'

export async function main(canvas: HTMLCanvasElement) {
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
		struct Vertex {
			@location(0) position: vec2f,
			@location(1) size: f32,
			@location(2) color: vec4f
		};

		struct Uniforms {
			projectionMatrix: mat4x4f,
			viewMatrix: mat4x4f,
			resolution: vec2f
		};

		struct VSOutput {
			@builtin(position) position: vec4f,
			@location(0) color: vec4f,
			@location(1) pointCoord: vec2f
		};
	
		@group(0) @binding(0) var<uniform> uni: Uniforms;

		@vertex fn vs(vert: Vertex, @builtin(vertex_index) vi: u32) -> VSOutput {
			let points = array(
				vec2f(-1, -1),
				vec2f( 1, -1),
				vec2f(-1,  1),
				vec2f(-1,  1),
				vec2f( 1, -1),
				vec2f( 1,  1),
				);
			let pos = points[vi];
			let clipPos = uni.projectionMatrix * uni.viewMatrix * vec4f(vert.position, 0, 1);
			let pointPos = vec4f(pos * vert.size / uni.resolution * clipPos.w, 0, 0);

			var vsOut: VSOutput;
			// vsOut.position = uni.projectionMatrix * uni.viewMatrix * vec4f(pos, 0, 1);
			vsOut.position = clipPos + pointPos;
			vsOut.color = vert.color;
			vsOut.pointCoord = pos;
			return vsOut;
		}

		@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
			let coord = vsOut.pointCoord;
			if(length(coord) > 1) {
				discard;
			}
			return vsOut.color;
		}
	`

	const module = device.createShaderModule({ code })

	const pipeline = device.createRenderPipeline({
		label: '1 pixel points',
		layout: 'auto',
		vertex: {
			module,
			entryPoint: 'vs',
			buffers: [
				{
					arrayStride: 2 * 4 + 1 * 4 + 4 * 1, // 2 floats, 4 bytes each
					stepMode: 'instance',
					attributes: [
						{ shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
						{ shaderLocation: 1, offset: 4 * 2, format: 'float32' }, // size
						{ shaderLocation: 2, offset: 4 * 3, format: 'unorm8x4' } // color
					]
				}
			]
		},
		fragment: {
			module,
			entryPoint: 'fs',
			targets: [{ format: presentationFormat }]
		}
	})

	const rand = (min: number, max: number) => min + Math.random() * (max - min)

	const kNumPoints = 100
	const vertexData = new Float32Array(kNumPoints * (2 + 1 + 1))
	const colorData = new Uint8Array(vertexData.buffer)
	for (let i = 0; i < kNumPoints; ++i) {
		const offset = i * 4
		vertexData[offset + 0] = rand(-30, 30)
		vertexData[offset + 1] = rand(-30, 30)
		vertexData[offset + 2] = rand(15, 15) //size
		const offsetColor = 12 + i * 16
		colorData[offsetColor + 0] = rand(0, 1) * 255
		colorData[offsetColor + 1] = rand(0, 1) * 255
		colorData[offsetColor + 2] = rand(0, 1) * 255
		colorData[offsetColor + 3] = 1 * 255
	}

	const vertexBuffer = device.createBuffer({
		label: 'vertex buffer vertices',
		size: vertexData.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	})
	device.queue.writeBuffer(vertexBuffer, 0, vertexData)

	//uniforms
	const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
	camera.position.set(0, 0, 100)
	const projectionMat = camera.projectionMatrix
	const viewMat = camera.matrixWorldInverse
	//@ts-ignore
	window.c = camera
	console.log(projectionMat.elements)
	console.log(viewMat.elements)

	const defs = makeShaderDataDefinitions(code)
	const uniformValues = makeStructuredView(defs.uniforms.uni)

	const uniformBuffer = device.createBuffer({
		size: uniformValues.arrayBuffer.byteLength, // transformUniformValues.byteLength,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	})

	//对应vs 里的@group(0) @binding(0)
	const bindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
	})

	const renderPassDescriptor: GPURenderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				// view: <- to be filled out when we render
				view: ctx.getCurrentTexture().createView(),
				clearValue: [0.3, 0.3, 0.3, 1],
				loadOp: 'clear',
				storeOp: 'store'
			}
		]
	}

	//@ts-ignore
	window.r = render
	function render() {
		if (!device || !ctx) return
		const canvasTexture = ctx.getCurrentTexture()
		const projectionMat = camera.projectionMatrix
		const viewMat = camera.matrixWorldInverse
		camera.updateProjectionMatrix()
		camera.updateMatrixWorld()
		uniformValues.set({
			projectionMatrix: projectionMat.elements,
			viewMatrix: viewMat.elements,
			resolution: [canvas.width, canvas.height]
		})
		device.queue.writeBuffer(uniformBuffer, 0, uniformValues.arrayBuffer)
		//@ts-ignore
		renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView()

		const encoder = device.createCommandEncoder()
		const pass = encoder.beginRenderPass(renderPassDescriptor)
		pass.setPipeline(pipeline)
		pass.setVertexBuffer(0, vertexBuffer)
		pass.setBindGroup(0, bindGroup)
		pass.draw(6, kNumPoints)
		pass.end()

		const commandBuffer = encoder.finish()
		device.queue.submit([commandBuffer])
	}

	const observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			canvas.width = canvas.offsetWidth
			canvas.height = canvas.offsetHeight
			render()
		}
	})
	observer.observe(canvas)
}

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

main(canvas)
