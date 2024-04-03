import Attribute from './attribute'

class Geometry {
	private attributes: Record<string, Attribute>
	private _vertexCount = -1
	private _instanceCount = -1
	private _indexBuffer: GPUBuffer | null
	private _indexArr: Uint32Array | null
	private _indexBufferNeedsUpdate = true

	constructor() {
		this.attributes = {}
		this._indexBuffer = null
		this._indexArr = null
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

	public setIndex(arr: Uint32Array) {
		this._indexArr = arr
		this._indexBufferNeedsUpdate = true
	}

	public getIndex() {
		return this._indexArr
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

	public getVertexBufferList(device: GPUDevice) {
		const bufferList: GPUBuffer[] = []
		for (let attribute of Object.values(this.attributes)) {
			if (attribute.needsUpdate || !attribute.buffer) attribute.updateBuffer(device)
			bufferList.push(attribute.buffer as GPUBuffer)
		}
		return bufferList
	}

	public getIndexBuffer(device: GPUDevice) {
		if (!this._indexArr) return
		if (this._indexBufferNeedsUpdate) this.udpateIndexBuffer(device)
		this._indexBufferNeedsUpdate = false
		return this._indexBuffer
	}

	public dispose() {
		for (let name in this.attributes) {
			this.attributes[name].dispose()
		}
		this.attributes = {}
		if (this._indexBuffer) this._indexBuffer.destroy()
	}

	private createIndexBuffer(device: GPUDevice) {
		if (!this._indexArr) return
		if (this._indexBuffer) this._indexBuffer.destroy()
		this._indexBuffer = device.createBuffer({
			label: 'index buffer',
			size: this._indexArr.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
		})
	}

	private udpateIndexBuffer(device: GPUDevice) {
		if (!this._indexArr) return
		if (!this._indexBuffer) this.createIndexBuffer(device)
		if (!this._indexBuffer) return
		device.queue.writeBuffer(this._indexBuffer, 0, this._indexArr)
	}
}

export default Geometry
