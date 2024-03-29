import { Matrix4, OrthographicCamera, PerspectiveCamera } from 'three'
import Scene from './Scene'

type IProps = {
	canvas: HTMLCanvasElement
	clearColor?: [number, number, number, number]
}

class Renderer {
	private outputCanvas: HTMLCanvasElement
	private device: GPUDevice
	private canvasCtx: GPUCanvasContext | null
	private renderPassDescriptor: GPURenderPassDescriptor
	private clearColor = [0.3, 0.3, 0.3, 1]
	private presentationFormat: GPUTextureFormat
	private _ready = false
	precreatedUniformBuffers: Record<string, GPUBuffer>

	constructor(props: IProps) {
		this.outputCanvas = props.canvas
		this.canvasCtx = this.outputCanvas.getContext('webgpu') || null
		if (!this.canvasCtx) {
			throw 'your browser not supports WebGPU'
		}
		if (props.clearColor) this.clearColor = props.clearColor.slice()
		this.initWebGPU()
	}

	get ready() {
		return this._ready
	}

	get width() {
		return this.outputCanvas.width
	}

	get height() {
		return this.outputCanvas.height
	}

	/**
	 * 根据camera获取projectionMatrix和viewMatrix，遍历scene.children。
	 * 从children[i]中获取到geometry和material。从geometry中获取顶点数据，从material中获取渲染管线（包含着色器）
	 * 每个模型设置一次renderPass，最后统一提交到GPU
	 * @param camera
	 * @param scene
	 */
	public render(camera: PerspectiveCamera | OrthographicCamera, scene: Scene) {
		console.log('render')
		if (!this.device || !this.canvasCtx || !this.ready) return
		this.updateCameraMatrix(camera)
		const { device, canvasCtx, renderPassDescriptor } = this

		//@ts-ignore
		renderPassDescriptor.colorAttachments[0].view = canvasCtx.getCurrentTexture().createView()
		const encoder = device.createCommandEncoder()
		const pass = encoder.beginRenderPass(renderPassDescriptor)
		for (let model of scene.modelList) {
			const { geometry, material } = model
			const vertexStateInfo = geometry.getVertexStateInfo()
			const { bufferList: vertexBufferList, locationList } = geometry.getVertexBufferList(this.device)
			const pipeline = material.getPipeline(this.device, this.presentationFormat, vertexStateInfo)
			if (!pipeline) continue
			const { bindGroups, groupIndexList } = material.getBindGroups(this, device, pipeline)
			pass.setPipeline(pipeline)
			for (let i = 0; i < bindGroups.length; ++i) {
				pass.setBindGroup(groupIndexList[i], bindGroups[i])
			}
			for (let i = 0; i < vertexBufferList.length; ++i) {
				pass.setVertexBuffer(locationList[i], vertexBufferList[i])
			}
			pass.draw(6, 10)
		}
		pass.end()

		const commandBuffer = encoder.finish()
		this.device.queue.submit([commandBuffer])
	}

	public resize() {
		if (!this.ready || !this.device) return
		this.device.queue.writeBuffer(
			this.precreatedUniformBuffers.resolution,
			0,
			new Float32Array([this.width, this.height])
		)
	}

	private async initWebGPU() {
		const adapter = await navigator.gpu?.requestAdapter()
		const device = await adapter?.requestDevice()
		if (!device) {
			throw 'your browser not supports WebGPU'
		}
		this.device = device
		if (!this.canvasCtx) {
			throw 'your browser not supports WebGPU'
		}
		this.presentationFormat = navigator.gpu.getPreferredCanvasFormat()
		this.canvasCtx.configure({
			device,
			format: this.presentationFormat,
			alphaMode: 'premultiplied'
		})
		this.renderPassDescriptor = {
			label: 'render pass',
			colorAttachments: [
				{
					view: this.canvasCtx.getCurrentTexture().createView(),
					clearValue: this.clearColor,
					loadOp: 'clear',
					storeOp: 'store'
				}
			]
		}
		const projectionMatrix = device.createBuffer({
			size: 16 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		})
		const viewMatrix = device.createBuffer({
			size: 16 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		})
		const resolution = device.createBuffer({
			size: 2 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		})
		this.precreatedUniformBuffers = {
			projectionMatrix,
			viewMatrix,
			resolution
		}
		this._ready = true
		this.resize()
	}

	private updateCameraMatrix(camera: PerspectiveCamera | OrthographicCamera) {
		if (!this.device || !this.ready) camera.updateProjectionMatrix()
		camera.updateMatrixWorld()
		const projectionMat = camera.projectionMatrix
		const viewMat = camera.matrixWorldInverse

		this.device.queue.writeBuffer(
			this.precreatedUniformBuffers.projectionMatrix,
			0,
			new Float32Array(projectionMat.elements)
		)
		this.device.queue.writeBuffer(this.precreatedUniformBuffers.viewMatrix, 0, new Float32Array(viewMat.elements))
	}
}

export default Renderer
