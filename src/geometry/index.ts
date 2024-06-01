class Index {
	private _array: Uint32Array
	private _buffer: GPUBuffer | null

	constructor(data: Uint32Array) {
		this._array = data
		this._buffer = null
	}

	get array() {
		return this._array
	}

	get buffer() {
		return this._buffer
	}

	public createBuffer(device: GPUDevice) {
		if (this._buffer) {
			this._buffer.destroy()
		}
		this._buffer = device.createBuffer({
			label: 'index buffer',
			size: this._array.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
		})
		device.queue.writeBuffer(this._buffer, 0, this._array)
	}

	public dispose() {
		if (this._buffer) {
			this._buffer.destroy()
		}
	}
}

export default Index
