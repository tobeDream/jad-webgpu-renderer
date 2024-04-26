import { TypedArray } from '../types'
import Buffer, { IProps as BufferProps } from './buffer'

class BufferPool {
	private bufferMap: Record<string, Buffer> = {}

	public getBuffer(id: string) {
		return this.bufferMap[id]
	}

	public writeBuffer(device: GPUDevice, id: string, valueBuffer: ArrayBuffer) {
		const buffer = this.bufferMap[id]
		if (!buffer) return
		device.queue.writeBuffer(buffer.GPUBuffer, buffer.offset, valueBuffer)
	}

	public addBuffer(param: BufferProps) {
		this.bufferMap[param.id] = new Buffer(param)
		return this.bufferMap[param.id]
	}

	public removeBuffer(id: string) {
		const buffer = this.bufferMap[id]
		if (buffer) {
			buffer.dispose()
			delete this.bufferMap[id]
		}
	}

	public dispose() {
		for (let id in this.bufferMap) {
			this.bufferMap[id].dispose()
		}
	}
}

export default BufferPool
