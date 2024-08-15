import { minStorageBufferOffsetAlignment, minUniformBufferOffsetAlignment } from '@/utils'
import Buffer, { IProps as BufferProps } from './buffer'
import BufferView from './bufferView'

class BufferPool {
	private bufferMap: Record<string, Buffer> = {}
	private _initialed = false

	get initialed() {
		return this._initialed
	}

	public createExclusiveBuffer(device: GPUDevice, bufferView: BufferView) {
		const buffer = new Buffer({
			usage: bufferView.usage,
			size: bufferView.size,
			device,
			bufferViews: [bufferView]
		})
		bufferView.buffer = buffer
		this.bufferMap[buffer.id] = buffer
	}

	public reallocateBuffer(device: GPUDevice, buffer: Buffer) {
		const bufferViews = buffer.bufferViews
		delete this.bufferMap[buffer.id]
		buffer.dispose()
		let bufferSize = 0
		for (let bv of bufferViews) {
			bv.offset = bufferSize
			if (bv.usedInUniform)
				bufferSize += Math.ceil(bv.size / minUniformBufferOffsetAlignment) * minUniformBufferOffsetAlignment
			else if (bv.usedInStorage)
				bufferSize += Math.ceil(bv.size / minStorageBufferOffsetAlignment) * minStorageBufferOffsetAlignment
			else bufferSize += bv.size
		}
		const newBuffer = new Buffer({ usage: bufferViews[0].usage, size: bufferSize, device, bufferViews })
		for (let bv of bufferViews) {
			bv.buffer = newBuffer
			bv.needsUpdate = true
		}
		this.bufferMap[newBuffer.id] = newBuffer
	}

	public createBuffers(device: GPUDevice, bufferViewList: BufferView[]) {
		const bufferViewsByUsage: Record<string, BufferView[]> = {}
		for (let bv of bufferViewList) {
			const usage = bv.usedInUniform ? bv.usage : bv.resourceName
			if (!bufferViewsByUsage[usage]) bufferViewsByUsage[usage] = []
			bufferViewsByUsage[usage].push(bv)
		}
		for (let usage in bufferViewsByUsage) {
			const bvs = bufferViewsByUsage[usage]
			let bufferSize = 0
			for (let bv of bvs) {
				bv.offset = bufferSize
				if (bv.usedInUniform)
					bufferSize += Math.ceil(bv.size / minUniformBufferOffsetAlignment) * minUniformBufferOffsetAlignment
				else if (bv.usedInStorage)
					bufferSize += Math.ceil(bv.size / minStorageBufferOffsetAlignment) * minStorageBufferOffsetAlignment
				else bufferSize += bv.size
			}
			const buffer = new Buffer({ usage: bvs[0].usage, size: bufferSize, device, bufferViews: bvs })
			for (let bv of bvs) bv.buffer = buffer
			this.bufferMap[buffer.id] = buffer
		}
		this._initialed = true
	}

	public dispose() {
		for (let id in this.bufferMap) {
			this.bufferMap[id].dispose()
		}
		this.bufferMap = {}
	}
}

export default BufferPool
