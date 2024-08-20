import { genId } from '@/utils'
import BufferView from './bufferView'

export type IProps = {
	usage: number
	size: number
	capacity: number
	resourceName: string
	device: GPUDevice
	bufferViews: BufferView[]
}
let i = 0

class Buffer {
	private _id: string
	private _buffer: GPUBuffer
	private _size: number
	private _capacity: number
	private _offset: number
	private _usage: number
	private _resourceName: string
	private _bufferViews: BufferView[] = []

	constructor(props: IProps) {
		this._id = `buffer_${props.resourceName}_${i++}`
		this._usage = props.usage
		this._size = props.size
		this._capacity = props.capacity
		this._offset = props.size
		this._resourceName = props.resourceName
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

	set size(s: number) {
		this._size = s
	}

	get capacity() {
		return this._capacity
	}

	get resourceName() {
		return this._resourceName
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
			size: this.capacity,
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
