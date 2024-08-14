import BufferPool from '@/buffer/bufferPool'
import BufferView from '@/buffer/bufferView'

class Index {
	private _array: Uint32Array
	private _bufferView: BufferView

	constructor(data: Uint32Array) {
		this._array = data
		this._bufferView = new BufferView({
			resourceName: 'vertex index',
			offset: 0,
			size: data.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
		})
	}

	get needsUpdate() {
		return this._bufferView.needsUpdate
	}

	set needsUpdate(v: boolean) {
		this._bufferView.needsUpdate = v
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

	public updateBuffer(device: GPUDevice, bufferPool: BufferPool) {
		if (this.needsUpdate) {
			const res = this.bufferView.updateBuffer(device, this._array, bufferPool)
			if (res) this.needsUpdate = false
		}
	}

	public dispose() {
		//@ts-ignore
		this._array = undefined
	}
}

export default Index
