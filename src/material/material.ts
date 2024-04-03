import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import { Blending } from '../types'
import Renderer from '../Renderer'
import Uniform from './uniform'
import Storage from './storage'
import Attribute from '@/geometry/attribute'
import { precreatedUniforms } from '@/utils'

type IProps = {
	shaderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	blending?: Blending
}

class Material {
	protected vsEntry = 'vs'
	protected fsEntry = 'fs'
	protected code: string
	protected uniforms: Record<string, Uniform>
	protected blending: Blending
	protected pipelineDescriptor: GPURenderPipelineDescriptor | null
	protected shaderModule: GPUShaderModule | null
	protected _defs: ShaderDataDefinitions

	constructor(props: IProps) {
		this.blending = props.blending || 'none'
		this.uniforms = {}
		this.code = props.shaderCode
		this.pipelineDescriptor = null
		this.shaderModule = null
		if (props.vertexShaderEntry) this.vsEntry = props.vertexShaderEntry
		if (props.fragmentShaderEntry) this.fsEntry = props.fragmentShaderEntry
		this.initUniforms(props.uniforms || {})
	}

	get defs() {
		return this._defs
	}

	protected initUniforms(uniforms: Record<string, any>) {
		const defs = makeShaderDataDefinitions(this.code)
		this._defs = defs
		for (let un in uniforms) {
			if (un in defs.uniforms) {
				this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: uniforms[un] })
			} else if (un in defs.storages) {
				this.uniforms[un] = new Storage({ name: un, def: defs.storages[un], value: uniforms[un] })
			}
		}
		for (let un of precreatedUniforms) {
			if (un in defs.uniforms) {
				this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: undefined })
			}
		}
	}

	public getUniform(name: string) {
		const uniform = this.uniforms[name]
		return uniform
	}

	public updateUniform(uniformName: string, value: any) {
		const uniform = this.uniforms[uniformName]
		if (!uniform) return
		uniform.udpateValue(value)
	}

	public getBindGroups(renderer: Renderer, device: GPUDevice, pipeline: GPURenderPipeline, attributes: Attribute[]) {
		const bindGroups: GPUBindGroup[] = []
		const uniformGroupIndexs = Object.values(this.uniforms).map((u) => u.group)
		const attributeGroupIndexs = attributes
			.map((attr) => this.defs.storages[attr.name]?.group)
			.filter((idx) => idx !== undefined)
		const groupIndexList = Array.from(new Set([...uniformGroupIndexs, ...attributeGroupIndexs]))
		for (let index of groupIndexList) {
			const descriptor: GPUBindGroupDescriptor = {
				layout: pipeline.getBindGroupLayout(index),
				entries: []
			}
			for (let un in this.uniforms) {
				const uniform = this.uniforms[un]
				if (uniform.group !== index) continue
				let buffer: GPUBuffer | null = null
				if (renderer.precreatedUniformBuffers[uniform.name]) {
					buffer = renderer.precreatedUniformBuffers[uniform.name]
				} else {
					if (uniform.needsUpdate) uniform.updateBuffer(device)
					buffer = uniform.getBuffer(device)
				}
				if (!buffer) continue
				const entries = descriptor.entries as GPUBindGroupEntry[]
				entries.push({
					binding: uniform.binding,
					resource: { buffer }
				})
			}
			for (let attr of attributes) {
				const def = this.defs.storages[attr.name]
				if (!def)
					throw `the definetion of attribute ${attr.name} not found in shader, attribute name must equal to the shader variable name. Please check`
				if (attr.storeType !== 'storageBuffer') continue
				const { group, binding } = def
				if (group !== index) continue
				if (attr.needsUpdate || !attr.buffer) attr.updateBuffer(device)
				if (!attr.buffer) continue
				const entries = descriptor.entries as GPUBindGroupEntry[]
				entries.push({
					binding: binding,
					resource: { buffer: attr.buffer }
				})
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
