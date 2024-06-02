import { genId } from '@/utils/index'
import Buffer from './buffer'

type IProps = {
	resourceName: string
	offset: number
	size: number
	usage: number
}

class BufferView {
	private _id: string
	private _resourceName: string
	private _offset: number
	private _size: number
	private _usage: number
	private _buffer: Buffer | null = null

	constructor(props: IProps) {
		this._id = 'bufferView_' + genId()
		this._offset = props.offset
		this._size = props.size
		this._usage = props.usage
		this._resourceName = props.resourceName
	}

	get id() {
		return this._id
	}

	get resourceName() {
		return this._resourceName
	}

	get offset() {
		return this._offset
	}

	set offset(o: number) {
		this._offset = o
	}

	get size() {
		return this._size
	}

	get usage() {
		return this._usage
	}

	get buffer() {
		return this._buffer || null
	}

	set buffer(b: Buffer | null) {
		this._buffer = b
	}

	get usedInUniform() {
		return !!(this._usage & GPUBufferUsage.UNIFORM)
	}

	get usedInStorage() {
		return !!(this._usage & GPUBufferUsage.STORAGE)
	}

	public updateBuffer(device: GPUDevice, valueBuffer: ArrayBuffer) {
		if (!this._buffer) return false
		device.queue.writeBuffer(this._buffer.GPUBuffer, this.offset, valueBuffer)
		return true
	}

	dispose() {
		//@ts-ignore
		this._bufferPool = undefined
	}
}

export default BufferView
