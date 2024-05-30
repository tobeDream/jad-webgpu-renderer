import { genId } from '@/utils/index'
import Buffer from './buffer'

type IProps = {
	offset: number
	size: number
	buffer: Buffer
}

class BufferView {
	private _id: string
	private _buffer: Buffer
	private _offset: number
	private _size: number

	constructor(props: IProps) {
		this._id = genId()
		this._buffer = props.buffer
		this._offset = props.offset
		this._size = props.size
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

	get buffer() {
		return this._buffer
	}
}

export default BufferView
