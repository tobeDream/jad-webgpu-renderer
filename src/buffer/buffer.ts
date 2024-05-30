import { genId } from '@/utils'

export type IProps = {
	id: string
	usage: number
	size: number
	device: GPUDevice
}

class Buffer {
	private _id: string
	private _buffer: GPUBuffer
	private _size: number
	private _usage: number
	private _bufferViewIds: string[] = []

	constructor(props: IProps) {
		this._id = 'buffer_' + genId()
		this._usage = props.usage
		this._size = props.size
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

	get bufferViewIds() {
		return this._bufferViewIds
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

	addBufferView(bufferViewId: string) {
		if (this._bufferViewIds.includes(bufferViewId)) return
		this._bufferViewIds.push(bufferViewId)
	}

	dispose() {
		this._buffer.destroy()
	}
}

export default Buffer
