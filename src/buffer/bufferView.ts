import { genId } from '@/utils/index'
import Buffer from './buffer'
import BufferPool from './bufferPool'

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
	private _needsUpdate = true

	constructor(props: IProps) {
		this._id = `bufferView_${props.resourceName}_${genId()}`
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

	get needsUpdate() {
		return this._needsUpdate
	}

	set needsUpdate(v: boolean) {
		this._needsUpdate = v
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

	set size(s: number) {
		this._size = s
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

	get GPUBuffer() {
		return this._buffer?.GPUBuffer || null
	}

	get usedInUniform() {
		return !!(this._usage & GPUBufferUsage.UNIFORM)
	}

	get usedInStorage() {
		return !!(this._usage & GPUBufferUsage.STORAGE)
	}

	public updateBuffer(device: GPUDevice, valueBuffer: ArrayBuffer, bufferPool: BufferPool) {
		if (!this._buffer) {
			this._buffer = bufferPool.getBuffer(device, this)
		}
		if (!this._buffer) {
			return false
		}
		if (this._buffer.capacity < valueBuffer.byteLength + this.offset && this.buffer) {
			this._size = valueBuffer.byteLength
			bufferPool.reallocateBuffer(device, this.buffer)
		} else if (!this.usedInUniform) {
			this._size = valueBuffer.byteLength
		}
		device.queue.writeBuffer(this._buffer.GPUBuffer, this.offset, valueBuffer)
		return true
	}

	public clone() {
		const bv = new BufferView({
			resourceName: this.resourceName,
			size: this.size,
			usage: this.usage,
			offset: this.offset,
		})
		if (this.buffer) {
			this.buffer.addBufferView(bv)
			bv.buffer = this.buffer
		}
		return bv
	}

	dispose() {
		//@ts-ignore
		this._bufferPool = undefined
		this.buffer?.removeBufferView(this)
	}
}

export default BufferView
