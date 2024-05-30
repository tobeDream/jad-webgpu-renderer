import { genId } from '@/utils/index'
import Buffer from './buffer'
import BufferPool from './bufferPool'

type IProps = {
	offset: number
	size: number
	usage: number
	bufferPool: BufferPool
}

class BufferView {
	private _id: string
	// private _bufferId: string //bufferId相同的BufferView共用同一个buffer
	private _offset: number
	private _size: number
	private _usage: number
	private _bufferPool: BufferPool

	constructor(props: IProps) {
		this._id = 'bufferView_' + genId()
		// this._bufferId = props.bufferId
		this._offset = props.offset
		this._size = props.size
		this._usage = props.usage
		this._bufferPool = props.bufferPool
	}

	get id() {
		return this._id
	}

	get offset() {
		return this._offset
	}

	get size() {
		return this._size
	}

	// get bufferId() {
	// 	return this._bufferId
	// }

	get usage() {
		return this._usage
	}

	public getBuffer() {
		return this._bufferPool.getBuffer(this.id)
	}

	dispose() {
		//@ts-ignore
		this._bufferPool = undefined
	}
}

export default BufferView
