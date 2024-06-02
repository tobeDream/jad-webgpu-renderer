import BufferView from '@/buffer/bufferView'
import Attribute from './attribute'
import Index from './index'

class Geometry {
	private attributes: Record<string, Attribute>
	private _vertexCount = -1
	private _instanceCount = -1
	private index: Index | null = null

	constructor() {
		this.attributes = {}
	}

	set vertexCount(v: number) {
		this._vertexCount = v
	}

	get vertexCount() {
		return this._vertexCount
	}

	set instanceCount(i: number) {
		this._instanceCount = i
	}

	get instanceCount() {
		return this._instanceCount
	}

	public getAttribute(name: string) {
		return this.attributes[name]
	}

	public setAttribute(attribtueName: string, attribute: Attribute) {
		if (attribute.shaderLocation === undefined) {
			let location = 0
			const existedLocations = Object.values(this.attributes)
				.map((attr) => attr.shaderLocation)
				.filter((l) => l !== undefined)
			while (existedLocations.includes(location)) location++
			attribute.shaderLocation = location
		}
		this.attributes[attribtueName] = attribute
		const count = attribute.array.length / attribute.itemSize
		if (attribute.stepMode === 'vertex' && this._vertexCount === -1) this._vertexCount = count
		if (attribute.stepMode === 'instance' && this._instanceCount === -1) this._instanceCount = count
	}

	public removeAttribute(attribtueName: string) {
		const attr = this.attributes[attribtueName]
		if (attr) {
			attr.dispose()
			delete this.attributes[attribtueName]
		}
	}

	public setIndex(arr: Uint32Array) {
		if (!this.index) this.index = new Index(arr)
		else this.index.array = arr
	}

	public getIndex() {
		return this.index?.array || null
	}

	public getIndexBufferView(device: GPUDevice) {
		if (!this.index) return
		this.index.updateBuffer(device)
		return this.index.bufferView
	}

	public getVertexStateInfo() {
		const vertexBufferLayouts: GPUVertexBufferLayout[] = []
		for (let attribute of Object.values(this.attributes)) {
			const { itemSize, array, shaderLocation, stepMode } = attribute
			const bufferLayout: GPUVertexBufferLayout = {
				arrayStride: itemSize * array.BYTES_PER_ELEMENT,
				stepMode,
				attributes: [
					{
						shaderLocation: shaderLocation || 0,
						offset: 0,
						format: attribute.getFormat()
					}
				]
			}
			vertexBufferLayouts.push(bufferLayout)
		}
		return vertexBufferLayouts
	}

	public getBufferViews() {
		const res: BufferView[] = []
		for (let an in this.attributes) res.push(this.attributes[an].bufferView)
		if (this.index) res.push(this.index.bufferView)
		return res
	}

	public getVertexBufferList(device: GPUDevice) {
		const bufferList: GPUBuffer[] = []
		for (let attribute of Object.values(this.attributes)) {
			attribute.updateBuffer(device)
			if (attribute.bufferView.buffer?.GPUBuffer)
				bufferList.push(attribute.bufferView.buffer.GPUBuffer as GPUBuffer)
		}
		return bufferList
	}

	public dispose() {
		for (let name in this.attributes) {
			this.attributes[name].dispose()
		}
		this.attributes = {}
	}
}

export default Geometry
