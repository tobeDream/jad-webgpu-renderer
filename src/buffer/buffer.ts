export type IProps = {
	id: string
	usage: number
	size: number
	device: GPUDevice
	offset?: number
}

class Buffer {
	private _id: string
	private _buffer: GPUBuffer
	private _offset: number = 0
	private _size: number
	private _usage: number

	constructor(props: IProps) {
		this._id = props.id
		this._usage = props.usage
		this._size = props.size
		if (props.offset) this._offset = props.offset
		this._buffer = this.createBuffer(props.device)
	}

	get id() {
		return this._id
	}

	get usage() {
		return this._usage
	}

	get size() {
		return this._size
	}

	get offset() {
		return this._offset
	}

	get buffer() {
		return this._buffer
	}

	createBuffer(device: GPUDevice) {
		const res = device.createBuffer({
			label: this.id,
			size: this.size,
			usage: this.usage
		})
		return res
	}

	dispose() {
		this._buffer.destroy()
	}
}

export default Buffer
