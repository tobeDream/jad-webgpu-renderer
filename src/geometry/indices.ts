import BufferView from '@/buffer/bufferView'

class Index {
	private _array: Uint32Array
	private _bufferView: BufferView
	private needsUpdate: boolean = true

	constructor(data: Uint32Array) {
		this._array = data
		this._bufferView = new BufferView({
			resourceName: 'vertex index',
			offset: 0,
			size: data.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
		})
	}

	get array() {
		return this._array
	}

	set array(value: Uint32Array) {
		this._array = value
		this.needsUpdate = true
	}

	get bufferView() {
		return this._bufferView
	}

	public updateBuffer(device: GPUDevice) {
		if (this.needsUpdate) {
			const res = this.bufferView.updateBuffer(device, this._array)
			if (res) this.needsUpdate = false
		}
	}

	public dispose() {
		//@ts-ignore
		this._array = undefined
	}
}

export default Index
