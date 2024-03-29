import { OrthographicCamera, PerspectiveCamera } from 'three'
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
		if (!this.device || !this.canvasCtx) return
		camera.updateProjectionMatrix()
		camera.updateMatrixWorld()
		const { device, canvasCtx, renderPassDescriptor } = this
		const projectionMat = camera.projectionMatrix
		const viewMat = camera.matrixWorldInverse
		for (let model of scene.modelList) {
			const projectionUniform = model.material.getUniform('projectionMatrix')
			const viewUniform = model.material.getUniform('viewMatrix')
			const resolutionUniform = model.material.getUniform('resolution')
			if (projectionUniform) projectionUniform.udpateValue(projectionMat.elements)
			if (viewUniform) viewUniform.udpateValue(viewMat.elements)
			if (resolutionUniform) resolutionUniform.udpateValue([this.width, this.height])
		}

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
			const { bindGroups, groupIndexList } = material.getBindGroups(device, pipeline)
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

	public resize(width: number, height: number) {}

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
		this._ready = true
	}
}

export default Renderer
