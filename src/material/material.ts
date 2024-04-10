import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import { Blending } from '../types'
import Renderer from '../Renderer'
import Uniform from './uniform'
import Storage from './storage'
import Attribute from '@/geometry/attribute'
import { TypedArray } from '../types'

type IProps = {
	shaderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
}

class Material {
	protected vsEntry = 'vs'
	protected fsEntry = 'fs'
	protected code: string
	protected uniforms: Record<string, Uniform>
	protected storages: Record<string, Storage>
	protected blending: Blending
	protected pipelineDescriptor: GPURenderPipelineDescriptor | null
	protected shaderModule: GPUShaderModule | null
	protected _defs: ShaderDataDefinitions

	constructor(props: IProps) {
		this.blending = props.blending || 'none'
		this.uniforms = {}
		this.storages = {}
		this.code = props.shaderCode
		this.pipelineDescriptor = null
		this.shaderModule = null
		if (props.vertexShaderEntry) this.vsEntry = props.vertexShaderEntry
		if (props.fragmentShaderEntry) this.fsEntry = props.fragmentShaderEntry
		this.parseShaderCode(props)
	}

	get defs() {
		return this._defs
	}

	protected parseShaderCode(props: IProps) {
		const defs = makeShaderDataDefinitions(this.code)
		const { uniforms = {}, storages = {} } = props
		this._defs = defs
		for (let un in defs.uniforms) {
			this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: uniforms[un] })
		}
		for (let sn in defs.storages) {
			this.storages[sn] = new Storage({ name: sn, def: defs.storages[sn], value: storages[sn] })
		}
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
		uniform.udpateValue(value)
	}

	public replaceStorageBuffer(sn: string, buffer: GPUBuffer) {
		const storage = this.storages[sn]
		if (storage) {
			storage.replaceBuffer(buffer)
		}
	}

	public updateStorage(storageName: string, value: TypedArray) {
		const storage = this.storages[storageName]
		if (!storage) return
		storage.udpateValue(value)
	}

	public getBindGroups(renderer: Renderer, device: GPUDevice, pipeline: GPURenderPipeline) {
		const bindGroups: GPUBindGroup[] = []
		const uniformGroupIndexs = Object.values(this.uniforms).map((u) => u.group)
		const storageGroupIndexs = Object.values(this.storages).map((u) => u.group)

		const groupIndexList = Array.from(new Set([...uniformGroupIndexs, ...storageGroupIndexs]))
		for (let index of groupIndexList) {
			const descriptor: GPUBindGroupDescriptor = {
				layout: pipeline.getBindGroupLayout(index),
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
					buffer = uniform.getBuffer(device)
				}
				if (!buffer) continue
				entries.push({ binding: uniform.binding, resource: { buffer } })
			}
			for (let sn in this.storages) {
				const storage = this.storages[sn]
				if (storage.group !== index) continue
				const buffer = storage.getBuffer(device)
				if (!buffer) continue
				entries.push({ binding: storage.binding, resource: { buffer } })
			}
			const bindGroup = device.createBindGroup(descriptor)
			bindGroups.push(bindGroup)
		}
		return { bindGroups, groupIndexList }
	}

	public getPipelineDescriptor(
		device: GPUDevice,
		format: GPUTextureFormat,
		vertexBufferLayouts: GPUVertexBufferLayout[]
	) {
		if (!this.pipelineDescriptor) this.createPipelineDescriptor(device, format, vertexBufferLayouts)
		return this.pipelineDescriptor
	}

	public recordComputeCommand(renderer: Renderer, encoder: GPUCommandEncoder) {}

	protected createPipelineDescriptor(
		device: GPUDevice,
		format: GPUTextureFormat,
		vertexBufferLayouts: GPUVertexBufferLayout[]
	) {
		if (!this.shaderModule) this.shaderModule = device.createShaderModule({ code: this.code })
		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: 'pipeline',
			layout: 'auto',
			vertex: {
				module: this.shaderModule,
				entryPoint: this.vsEntry,
				buffers: vertexBufferLayouts
			},
			fragment: {
				module: this.shaderModule,
				entryPoint: this.fsEntry,
				targets: [{ format }]
			}
		}
		this.configBlending(pipelineDescriptor)
		this.pipelineDescriptor = pipelineDescriptor
	}

	protected configBlending(pipelineDescriptor: GPURenderPipelineDescriptor) {
		switch (this.blending) {
			case 'normalBlending': {
				//@ts-ignore
				pipelineDescriptor.fragment.targets[0].blend = {
					color: {
						srcFactor: 'one',
						dstFactor: 'one-minus-src-alpha'
					},
					alpha: {
						srcFactor: 'one',
						dstFactor: 'one-minus-src-alpha'
					}
				}
				break
			}
			case 'additiveBlending': {
				//@ts-ignore
				pipelineDescriptor.fragment.targets[0].blend = {
					color: {
						srcFactor: 'one',
						dstFactor: 'one'
					},
					alpha: {
						srcFactor: 'one',
						dstFactor: 'one'
					}
				}
				break
			}
			default: {
				break
			}
		}
		return pipelineDescriptor
	}
}

export default Material
