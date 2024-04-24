import PipelineBase, { IProps as BaseProps } from './pipelineBase'
import Renderer from '@/Renderer'

type IProps = BaseProps & {
	vsEntry: string
	fsEntry: string
}

class RenderPipeline extends PipelineBase {
	protected pipeline: GPURenderPipeline | null = null
	private vsEntry: string
	private fsEntry: string
	constructor(props: IProps) {
		super(props)
		this.vsEntry = props.vsEntry
		this.fsEntry = props.fsEntry
	}

	private createShaderModule(device: GPUDevice) {}

	private createPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		const { device, presentationFormat } = renderer
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
				targets: [{ format: presentationFormat }]
			}
		}
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
		if (renderer.antialias) pipelineDescriptor.multisample = { count: 4 }
		this.pipeline = device.createRenderPipeline(pipelineDescriptor)
	}

	getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		const { device } = renderer
		if (!this.pipeline) this.createPipeline(renderer, vertexBufferLayouts)
		return this.pipeline
	}

	getBindGroups(renderer: Renderer): { bindGroups: GPUBindGroup[]; groupIndexList: number[] } {
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
}

export default RenderPipeline
