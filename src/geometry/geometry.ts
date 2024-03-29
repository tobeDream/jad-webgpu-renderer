import Attribute from './attribute'

class Geometry {
	private attributes: Record<string, Attribute>

	constructor() {
		this.attributes = {}
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
	}

	public removeAttribute(attribtueName: string) {
		const attr = this.attributes[attribtueName]
		if (attr) {
			attr.dispose()
			delete this.attributes[attribtueName]
		}
	}

	public dispose() {
		for (let name in this.attributes) {
			this.attributes[name].dispose()
		}
		this.attributes = {}
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
		const locationList: number[] = []
		for (let attribute of Object.values(this.attributes)) {
			if (attribute.needsUpdate || !attribute.buffer) attribute.updateBuffer(device)
			bufferList.push(attribute.buffer as GPUBuffer)
			locationList.push(attribute.shaderLocation || 0)
		}
		return { bufferList, locationList }
	}

	public getIndexBuffer(device: GPUDevice) {}
}

export default Geometry
