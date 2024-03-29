import { makeShaderDataDefinitions } from 'webgpu-utils'
import { Blending } from 'localType'
import Renderer from '../Renderer'
import Uniform from './uniform'

type IProps = {
	shaderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	blending?: Blending
}

const bufferExistedUnifoms = ['projectionMatrix', 'viewMatrix', 'resolution']

class Material {
	private vsEntry = 'vs'
	private fsEntry = 'fs'
	private code: string
	private uniforms: Record<string, Uniform>
	private blending: Blending
	private pipeline: GPURenderPipeline | null
	private shaderModule: GPUShaderModule | null

	constructor(props: IProps) {
		this.blending = props.blending || 'none'
		this.uniforms = {}
		this.code = props.shaderCode
		this.pipeline = null
		this.shaderModule = null
		if (props.vertexShaderEntry) this.vsEntry = props.vertexShaderEntry
		if (props.fragmentShaderEntry) this.fsEntry = props.fragmentShaderEntry
		this.initUniforms(props.uniforms || {})
	}

	private initUniforms(uniforms: Record<string, any>) {
		const defs = makeShaderDataDefinitions(this.code)
		console.log(defs)
		for (let un in defs.uniforms) {
			this.uniforms[un] = new Uniform({ name: un, def: defs.uniforms[un], value: uniforms[un] })
		}
	}

	public getUniform(name: string) {
		const uniform = this.uniforms[name]
		return uniform
	}

	public getBindGroups(renderer: Renderer, device: GPUDevice, pipeline: GPURenderPipeline) {
		const bindGroups: GPUBindGroup[] = []
		const groupIndexList = Array.from(new Set(Object.values(this.uniforms).map((u) => u.group)))
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
			const bindGroup = device.createBindGroup(descriptor)
			bindGroups.push(bindGroup)
		}
		return { bindGroups, groupIndexList }
	}

	public getPipeline(device: GPUDevice, format: GPUTextureFormat, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		if (!this.pipeline) this.createPipeline(device, format, vertexBufferLayouts)
		return this.pipeline
	}

	private createPipeline(device: GPUDevice, format: GPUTextureFormat, vertexBufferLayouts: GPUVertexBufferLayout[]) {
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
		this.pipeline = device.createRenderPipeline(pipelineDescriptor)
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
