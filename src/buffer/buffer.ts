import { genId } from '@/utils'
import BufferView from './bufferView'

export type IProps = {
	usage: number
	size: number
	device: GPUDevice
	bufferViews: BufferView[]
}

class Buffer {
	private _id: string
	private _buffer: GPUBuffer
	private _size: number
	private _usage: number
	private _bufferViews: BufferView[] = []

	constructor(props: IProps) {
		this._id = 'buffer_' + genId()
		this._usage = props.usage
		this._size = props.size
		this._buffer = this.createBuffer(props.device)
		this._bufferViews = props.bufferViews
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

	get bufferViews() {
		return this._bufferViews
	}

	get GPUBuffer() {
		return this._buffer
	}

	reallocate(device: GPUDevice, size: number) {
		this.dispose()
		this._size = size
		this.createBuffer(device)
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
		this._bufferViews = []
	}
}

export default Buffer
