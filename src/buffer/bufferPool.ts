import Buffer, { IProps as BufferProps } from './buffer'
import BufferView from './bufferView'

class BufferPool {
	private bufferMap?: Record<string, Buffer> = undefined
	private bufferViewList: BufferView[] = []

	get initialed() {
		return this.bufferMap !== undefined
	}

	public getBuffer(id: string) {
		return this.bufferMap ? this.bufferMap[id] : null
	}

	public createBufferView(usage: number, size: number) {
		const bv = new BufferView({ offset: 0, size, usage, bufferPool: this })
		this.bufferViewList.push(bv)
		return bv
	}

	public createBuffers(device: GPUDevice) {
		const bufferViewsByUsage: Record<number, BufferView[]> = {}
		for (let bv of this.bufferViewList) {
			const { usage } = bv
			if (!bufferViewsByUsage[usage]) bufferViewsByUsage[usage] = []
			bufferViewsByUsage[usage].push(bv)
		}
		this.bufferMap = {}
		for (let usage in bufferViewsByUsage) {
			const bvs = bufferViewsByUsage[usage]
			let bufferSize = 0
			const offsets: number[] = []
			const bvIds: string[] = []
			for (let bv of bvs) {
				bvIds.push(bv.id)
				offsets.push(bufferSize)
				bufferSize += bv.size
			}
			const buffer = new Buffer({ usage: Number(usage), size: bufferSize, device, bufferViewIds: bvIds })
			this.bufferMap[buffer.id] = buffer
		}
	}

	// public writeBuffer(device: GPUDevice, id: string, valueBuffer: ArrayBuffer) {
	// 	const buffer = this.bufferMap[id]
	// 	if (!buffer) return
	// 	device.queue.writeBuffer(buffer.GPUBuffer, buffer.offset, valueBuffer)
	// }

	// public addBuffer(param: BufferProps) {
	// 	this.bufferMap[param.id] = new Buffer(param)
	// 	return this.bufferMap[param.id]
	// }

	// public removeBuffer(id: string) {
	// 	const buffer = this.bufferMap[id]
	// 	if (buffer) {
	// 		buffer.dispose()
	// 		delete this.bufferMap[id]
	// 	}
	// }

	public dispose() {
		for (let id in this.bufferMap) {
			this.bufferMap[id].dispose()
		}
		this.bufferMap = {}
		this.bufferViewList = []
	}
}

export default BufferPool
