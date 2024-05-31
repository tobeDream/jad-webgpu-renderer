import Buffer, { IProps as BufferProps } from './buffer'
import BufferView from './bufferView'

class BufferPool {
	private bufferMap?: Record<string, Buffer> = undefined

	get initialed() {
		return this.bufferMap !== undefined
	}

	// public removeBufferView(bv: BufferView) {
	// 	const index = this.bufferViewList.indexOf(bv)
	// 	if (index !== -1) this.bufferViewList.splice(index, 1)
	// 	if (this.bufferMap) {
	// 		for (let bufferId in this.bufferMap) {
	// 			const index = this.bufferMap[bufferId].bufferViewIds.indexOf(bv.id)
	// 			if (index !== -1) {
	// 				const buffer = this.bufferMap[bufferId]
	// 				buffer.bufferViewIds.splice(index, 1)
	// 				if (buffer.bufferViewIds.length === 0) {
	// 					delete this.bufferMap[bufferId]
	// 					buffer.dispose()
	// 				}
	// 			}
	// 		}
	// 	}
	// }

	// public createBufferView(usage: number, size: number) {
	// 	const bv = new BufferView({ offset: 0, size, usage, bufferPool: this })
	// 	this.bufferViewList.push(bv)
	// 	return bv
	// }

	// public getBuffer(bufferViewId: string) {
	// 	if (!this.bufferMap) return null
	// 	for (let bufferId in this.bufferMap) {
	// 		if (this.bufferMap[bufferId].bufferViewIds.includes(bufferViewId)) return this.bufferMap[bufferId]
	// 	}
	// 	return null
	// }

	public createBuffers(device: GPUDevice, bufferViewList: BufferView[]) {
		const bufferViewsByUsage: Record<number, BufferView[]> = {}
		for (let bv of bufferViewList) {
			const { usage } = bv
			if (!bufferViewsByUsage[usage]) bufferViewsByUsage[usage] = []
			bufferViewsByUsage[usage].push(bv)
		}
		this.bufferMap = {}
		for (let usage in bufferViewsByUsage) {
			const bvs = bufferViewsByUsage[usage]
			let bufferSize = 0
			const bvIds: string[] = []
			for (let bv of bvs) {
				bvIds.push(bv.id)
				bv.offset = bufferSize
				bufferSize += Math.ceil(bv.size / 256) * 256
			}
			const buffer = new Buffer({ usage: Number(usage), size: bufferSize, device, bufferViewIds: bvIds })
			for (let bv of bvs) {
				bv.buffer = buffer
			}
			this.bufferMap[buffer.id] = buffer
		}
	}

	public dispose() {
		for (let id in this.bufferMap) {
			this.bufferMap[id].dispose()
		}
		this.bufferMap = {}
	}
}

export default BufferPool
