import { OrthographicCamera, PerspectiveCamera } from 'three'
import Scene from './Scene'

type IProps = {
	canvas: HTMLCanvasElement
	clearColor?: [number, number, number, number]
}

const delay = (t = 1000) => new Promise((resolve) => setTimeout(resolve, t))

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
		this.outputCanvas.width = this.outputCanvas.offsetWidth * window.devicePixelRatio
		this.outputCanvas.height = this.outputCanvas.offsetHeight * window.devicePixelRatio
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
	public async render(camera: PerspectiveCamera | OrthographicCamera, scene: Scene) {
		let wait = 0
		while (!this.ready) {
			await delay(20)
			wait += 20
			if (wait > 2000) return
		}
		if (!this.device || !this.canvasCtx) return
		this.updateCameraMatrix(camera)
		const { device, canvasCtx, renderPassDescriptor } = this
		console.log(this.outputCanvas.width, this.outputCanvas.height)

		//@ts-ignore
		renderPassDescriptor.colorAttachments[0].view = canvasCtx.getCurrentTexture().createView()
		const encoder = device.createCommandEncoder()
		const pass = encoder.beginRenderPass(renderPassDescriptor)
		for (let model of scene.modelList) {
			const { geometry, material } = model
			if (geometry.vertexCount === -1) continue
			const vertexStateInfo = geometry.getVertexStateInfo()
			const { bufferList: vertexBufferList, locationList } = geometry.getVertexBufferList(this.device)
			const pipeline = material.getPipeline(this.device, this.presentationFormat, vertexStateInfo)
			if (!pipeline) continue
			const { bindGroups, groupIndexList } = material.getBindGroups(
				this,
				device,
				pipeline,
				geometry.getStorageAttrbutes()
			)
			console.log(bindGroups, groupIndexList)
			pass.setPipeline(pipeline)
			for (let i = 0; i < bindGroups.length; ++i) {
				pass.setBindGroup(groupIndexList[i], bindGroups[i])
			}
			for (let i = 0; i < vertexBufferList.length; ++i) {
				pass.setVertexBuffer(locationList[i], vertexBufferList[i])
			}
			const indexBuffer = geometry.getIndexBuffer(device)
			if (indexBuffer) {
				pass.setIndexBuffer(indexBuffer, 'uint32')
			}
			const instanceCount = geometry.instanceCount > -1 ? geometry.instanceCount : undefined
			const index = geometry.getIndex()
			if (index) pass.drawIndexed(index.length, instanceCount)
			else pass.draw(geometry.vertexCount, instanceCount)
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
		const device = await adapter?.requestDevice({
			requiredLimits: {
				//设置单个buffer上限为800MB，略大于一亿个点的坐标Float32Array大小
				maxBufferSize: 800 * 1024 * 1024
			}
		})
		if (!device) {
			throw 'your browser not supports WebGPU'
		}
		this.device = device
		//@ts-ignore
		window.limits = device.limits
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
