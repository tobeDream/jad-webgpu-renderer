import { minStorageBufferOffsetAlignment, minUniformBufferOffsetAlignment } from '@/utils'
import Buffer, { IProps as BufferProps } from './buffer'
import BufferView from './bufferView'

class BufferPool {
	private bufferMap?: Record<string, Buffer> = undefined

	get initialed() {
		return this.bufferMap !== undefined
	}

	public createBuffers(device: GPUDevice, bufferViewList: BufferView[]) {
		const bufferViewsByUsage: Record<string, BufferView[]> = {}
		for (let bv of bufferViewList) {
			const usage = bv.usedInUniform ? bv.usage : bv.resourceName
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
				if (bv.usedInUniform)
					bufferSize += Math.ceil(bv.size / minUniformBufferOffsetAlignment) * minUniformBufferOffsetAlignment
				else if (bv.usedInStorage)
					bufferSize += Math.ceil(bv.size / minStorageBufferOffsetAlignment) * minStorageBufferOffsetAlignment
				else bufferSize += bv.size
			}
			const buffer = new Buffer({ usage: bvs[0].usage, size: bufferSize, device, bufferViewIds: bvIds })
			for (let bv of bvs) bv.buffer = buffer
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
