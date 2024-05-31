import { Camera } from './camera/camera'
import BufferPool from './buffer/bufferPool'
import { Object3D } from './Object3D'
import Renderer from './Renderer'
import Geometry from './geometry/geometry'
import Material from './material/material'

type Options = {}

class Model {
	protected _geometry: Geometry
	protected _material: Material
	protected _visible: boolean
	protected _renderOrder: number
	protected bufferPool = new BufferPool()
	protected textures: Record<string, GPUTexture> = {}

	constructor(geometry: Geometry, material: Material, opts?: Options) {
		this._geometry = geometry
		this._material = material
		this._visible = true
		this._renderOrder = 0
	}

	get geometry() {
		return this._geometry
	}

	set geometry(geo: Geometry) {
		this._geometry = geo
	}

	get material() {
		return this._material
	}

	set material(mat: Material) {
		this._material = mat
	}

	get visible() {
		return this._visible
	}

	set visible(v: boolean) {
		this._visible = v
	}

	get renderOrder() {
		return this._renderOrder
	}

	set renderOrder(r: number) {
		this._renderOrder = r
	}

	public updateTexture(tn: string, texture: GPUTexture) {
		if (this.textures[tn]) this.textures[tn].destroy()
		this.textures[tn] = texture
	}

	public prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera) {}

	private initBufferPool(device: GPUDevice) {
		const { material } = this
		this.bufferPool.createBuffers(device, material.getBufferViews())
	}

	public render(
		renderer: Renderer,
		pass: GPURenderPassEncoder,
		camera: Camera,
		textures?: Record<string, GPUTexture>
	) {
		const { geometry, material } = this
		const { device } = renderer
		if (!this.bufferPool.initialed) this.initBufferPool(device)
		const vertexStateInfo = geometry.getVertexStateInfo()
		const vertexBufferList = geometry.getVertexBufferList(device)

		const pipeline = material.getPipeline(renderer, vertexStateInfo)
		if (!pipeline) return
		const { bindGroups, groupIndexList } = material.getBindGroups(
			renderer,
			camera,
			this.bufferPool,
			textures || this.textures
		)
		pass.setPipeline(pipeline)
		for (let i = 0; i < bindGroups.length; ++i) {
			pass.setBindGroup(groupIndexList[i], bindGroups[i])
		}
		for (let i = 0; i < vertexBufferList.length; ++i) {
			pass.setVertexBuffer(i, vertexBufferList[i])
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

	public dispose() {
		this._geometry.dispose()
		this._material.dispose()
		this.bufferPool.dispose()
		for (let tid in this.textures) {
			this.textures[tid].destroy()
		}
		this.textures = {}
	}
}

export default Model
