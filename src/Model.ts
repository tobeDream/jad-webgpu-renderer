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
	protected bufferPool = new BufferPool()
	protected textures: Record<string, GPUTexture> = {}

	constructor(geometry: Geometry, material: Material, opts?: Options) {
		this._geometry = geometry
		this._material = material
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

	public updateTexture(tn: string, texture: GPUTexture) {
		if (this.textures[tn]) this.textures[tn].destroy()
		this.textures[tn] = texture
	}

	public prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera) {}

	public render(
		renderer: Renderer,
		pass: GPURenderPassEncoder,
		camera: Camera,
		textures?: Record<string, GPUTexture>
	) {
		const { geometry, material } = this
		const { device } = renderer
		// if (geometry.vertexCount === -1) continue
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
}

export default Model
