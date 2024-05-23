import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import Renderer from '../../Renderer'
import { Blending, TypedArray } from '../../types'
import Uniform from '../uniform'
import Storage from '../storage'
import BufferPool from '@/buffer/bufferPool'
import { Camera } from '@/camera/camera'

export type IProps = {
	id: string
	shaderCode: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
}

abstract class PipelineBase {
	protected id: string
	protected code: string
	protected uniforms: Record<string, Uniform> = {}
	protected storages: Record<string, Storage> = {}
	protected blending: Blending = 'none'
	protected shaderModule: GPUShaderModule | null = null
	protected _defs: ShaderDataDefinitions
	protected textureInfos: Record<string, { group: number; binding: number }>
	protected pipeline: GPUPipelineBase | null = null

	constructor(props: IProps) {
		this.id = props.id
		this.code = props.shaderCode
		this.blending = props.blending || 'none'
		this.textureInfos = {}
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
		for (let tn in defs.textures) {
			this.textureInfos[tn] = { group: defs.textures[tn].group, binding: defs.textures[tn].binding }
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
		bufferPool: BufferPool,
		camera: Camera,
		textures: Record<string, GPUTexture>
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
				if (uniform.name === 'projectionMatrix') {
					buffer = camera.getProjectionMatBuf(device)
				} else if (uniform.name === 'viewMatrix') {
					buffer = camera.getViewMatBuf(device)
				} else if (uniform.name === 'resolution') {
					buffer = renderer.resolutionBuf
				} else {
					buffer = bufferPool.getBuffer(un)?.GPUBuffer
					if (!buffer) {
						buffer = bufferPool.addBuffer({
							id: un,
							size: uniform.byteLength,
							usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
							device
						}).GPUBuffer
					}
					if (uniform.needsUpdate) {
						bufferPool.writeBuffer(device, un, uniform.arrayBuffer)
						uniform.needsUpdate = false
					}
				}
				if (!buffer) continue
				entries.push({ binding: uniform.binding, resource: { buffer } })
			}
			for (let sn in this.storages) {
				const storage = this.storages[sn]
				if (storage.group !== index) continue
				let buffer = bufferPool.getBuffer(sn)
				if (!buffer) {
					buffer = bufferPool.addBuffer({
						id: sn,
						size: storage.byteLength,
						usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
						device
					})
				}
				// //因为 storage buffer 长度可变，所以如果 TypedArray 长度变化需要重新分配 GPUBuffer
				// if (storage.byteLength !== buffer.size) {
				// 	buffer.reallocate(device, storage.byteLength)
				// }
				if (storage.needsUpdate && storage.value) {
					bufferPool.writeBuffer(device, sn, storage.value.buffer)
					storage.needsUpdate = false
				}
				if (!buffer) continue
				entries.push({ binding: storage.binding, resource: { buffer: buffer.GPUBuffer } })
			}
			for (let tn in this.textureInfos) {
				const { group, binding } = this.textureInfos[tn]
				if (group !== index) continue
				const texture = textures[tn]
				if (!texture) continue
				entries.push({ binding, resource: texture.createView() })
			}
			const bindGroup = device.createBindGroup(descriptor)
			bindGroups.push(bindGroup)
		}
		return { bindGroups, groupIndexList }
	}
}

export default PipelineBase
