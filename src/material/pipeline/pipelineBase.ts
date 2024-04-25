import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import Renderer from '../../Renderer'
import { Blending, TypedArray } from '../../types'
import Uniform from '../uniform'
import Storage from '../storage'
import BufferPool from '@/buffer/bufferPool'

export type IProps = {
	shaderCode: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
}

abstract class PipelineBase {
	protected code: string
	protected uniforms: Record<string, Uniform> = {}
	protected storages: Record<string, Storage> = {}
	protected blending: Blending = 'none'
	protected pipeline: GPUPipelineBase | null = null
	protected shaderModule: GPUShaderModule | null = null
	protected _defs: ShaderDataDefinitions

	constructor(props: IProps) {
		this.code = props.shaderCode
		this.blending = props.blending || 'none'
		this._defs = this.parseShaderCode(props)
	}

	get defs() {
		return this._defs
	}

	protected parseShaderCode(props: IProps) {
		const defs = makeShaderDataDefinitions(props.shaderCode)
		const { uniforms = {}, storages = {} } = props
		for (let un in defs.uniforms) {
			this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: uniforms[un] })
		}
		for (let sn in defs.storages) {
			this.storages[sn] = new Storage({ name: sn, def: defs.storages[sn], value: storages[sn] })
		}
		return defs
	}

	public getUniform(name: string) {
		const uniform = this.uniforms[name]
		return uniform
	}

	public getStorage(name: string) {
		const storage = this.storages[name]
		return storage
	}

	public updateUniform(uniformName: string, value: any) {
		const uniform = this.uniforms[uniformName]
		if (!uniform) return
		uniform.updateValue(value)
	}

	public updateStorage(storageName: string, value: TypedArray) {
		const storage = this.storages[storageName]
		if (!storage) return
		storage.updateValue(value)
	}

	public getBindGroups(
		renderer: Renderer,
		bufferPool: BufferPool
	): { bindGroups: GPUBindGroup[]; groupIndexList: number[] } {
		if (!this.pipeline) return { bindGroups: [], groupIndexList: [] }

		const { device } = renderer
		const bindGroups: GPUBindGroup[] = []
		const uniformGroupIndexs = Object.values(this.uniforms).map((u) => u.group)
		const storageGroupIndexs = Object.values(this.storages).map((u) => u.group)

		const groupIndexList = Array.from(new Set([...uniformGroupIndexs, ...storageGroupIndexs]))
		for (let index of groupIndexList) {
			const descriptor: GPUBindGroupDescriptor = {
				layout: this.pipeline.getBindGroupLayout(index),
				entries: []
			}
			const entries = descriptor.entries as GPUBindGroupEntry[]
			for (let un in this.uniforms) {
				const uniform = this.uniforms[un]
				if (uniform.group !== index) continue
				let buffer: GPUBuffer | null = null
				if (renderer.precreatedUniformBuffers[uniform.name]) {
					buffer = renderer.precreatedUniformBuffers[uniform.name]
				} else {
					if (!bufferPool.getGPUBuffer(un)) {
						bufferPool.addBuffer({
							id: un,
							size: uniform.byteLength,
							usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
							device
						}).buffer
					}
					if (uniform.needsUpdate) {
						bufferPool.writeBuffer(device, un, uniform.arrayBuffer)
						uniform.needsUpdate = false
					}
					buffer = bufferPool.getGPUBuffer(uniform.name)
				}
				if (!buffer) continue
				entries.push({ binding: uniform.binding, resource: { buffer } })
			}
			for (let sn in this.storages) {
				const storage = this.storages[sn]
				if (storage.group !== index) continue
				if (!bufferPool.getGPUBuffer(sn)) {
					bufferPool.addBuffer({
						id: sn,
						size: storage.byteLength,
						usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
						device
					})
				}
				if (storage.needsUpdate && storage.value) {
					bufferPool.writeBuffer(device, sn, storage.value.buffer)
				}
				const buffer = bufferPool.getGPUBuffer(sn)
				if (!buffer) continue
				entries.push({ binding: storage.binding, resource: { buffer } })
			}
			const bindGroup = device.createBindGroup(descriptor)
			bindGroups.push(bindGroup)
		}
		return { bindGroups, groupIndexList }
	}
}

export default PipelineBase
