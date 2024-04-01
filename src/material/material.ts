import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import { Blending } from 'localType'
import Renderer from '../Renderer'
import Uniform from './uniform'
import Attribute from '@/geometry/attribute'

type IProps = {
	shaderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	blending?: Blending
}

class Material {
	private vsEntry = 'vs'
	private fsEntry = 'fs'
	private code: string
	private uniforms: Record<string, Uniform>
	private blending: Blending
	private pipelineDescriptor: GPURenderPipelineDescriptor | null
	private shaderModule: GPUShaderModule | null
	private _defs: ShaderDataDefinitions

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

	private initUniforms(uniforms: Record<string, any>) {
		const defs = makeShaderDataDefinitions(this.code)
		this._defs = defs
		defs.storages
		for (let un in defs.uniforms) {
			this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: uniforms[un] })
		}
	}

	public getUniform(name: string) {
		const uniform = this.uniforms[name]
		return uniform
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
				if (!def || attr.storeType !== 'storageBuffer') continue
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

	private createPipelineDescriptor(
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

	private configBlending(pipelineDescriptor: GPURenderPipelineDescriptor) {
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
