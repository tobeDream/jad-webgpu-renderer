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
	private _offset: number
	private _usage: number
	private _bufferViews: BufferView[] = []

	constructor(props: IProps) {
		this._id = 'buffer_' + genId()
		this._usage = props.usage
		this._size = props.size
		this._offset = props.size
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

	get offset() {
		return this._offset
	}

	set offset(v: number) {
		this._offset = v
	}

	addBufferView(bv: BufferView) {
		if (!this.bufferViews.includes(bv)) {
			this.bufferViews.push(bv)
		}
	}

	removeBufferView(bv: BufferView) {
		const index = this._bufferViews.findIndex((b) => b === bv)
		if (index > -1) {
			this._bufferViews.splice(index, 1)
			if (this.bufferViews.length === 0) {
				this.dispose()
			}
		}
	}

	// reallocate(device: GPUDevice, size: number) {
	// 	this.dispose()
	// 	this._size = size
	// 	this.createBuffer(device)
	// }

	createBuffer(device: GPUDevice) {
		const res = device.createBuffer({
			label: this.id,
			size: this.size,
			usage: this.usage,
		})
		return res
	}

	dispose() {
		this._buffer.destroy()
		this._bufferViews = []
	}
}

export default Buffer
