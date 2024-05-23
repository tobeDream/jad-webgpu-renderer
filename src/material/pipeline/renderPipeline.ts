import PipelineBase, { IProps as BaseProps } from './pipelineBase'
import Renderer from '@/Renderer'

type IProps = BaseProps & {
	vsEntry: string
	fsEntry: string
	presentationFormat?: GPUTextureFormat
	bindGroupLayoutDescriptors?: GPUBindGroupLayoutDescriptor[]
}

class RenderPipeline extends PipelineBase {
	protected pipeline: GPURenderPipeline | null = null
	private vsEntry: string
	private fsEntry: string
	private bindGroupLayoutDescriptors?: GPUBindGroupLayoutDescriptor[]
	private presentationFormat?: GPUTextureFormat
	constructor(props: IProps) {
		super(props)
		this.vsEntry = props.vsEntry
		this.fsEntry = props.fsEntry
		this.presentationFormat = props.presentationFormat
		this.bindGroupLayoutDescriptors = props.bindGroupLayoutDescriptors
	}

	private createPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		const { device, presentationFormat } = renderer
		if (!this.shaderModule) this.shaderModule = device.createShaderModule({ code: this.code })
		const pipelineDescriptor: GPURenderPipelineDescriptor = {
			label: 'pipeline-' + this.id,
			layout: this.bindGroupLayoutDescriptors
				? device.createPipelineLayout({
						bindGroupLayouts: this.bindGroupLayoutDescriptors.map((d) => device.createBindGroupLayout(d))
					})
				: 'auto',
			vertex: {
				module: this.shaderModule,
				entryPoint: this.vsEntry,
				buffers: vertexBufferLayouts
			},
			fragment: {
				module: this.shaderModule,
				entryPoint: this.fsEntry,
				targets: [{ format: this.presentationFormat || presentationFormat }]
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
			case 'max':
			case 'min': {
				//@ts-ignore
				pipelineDescriptor.fragment.targets[0].blend = {
					color: {
						srcFactor: 'one',
						dstFactor: 'one',
						operation: this.blending
					},
					alpha: {
						srcFactor: 'one',
						dstFactor: 'one',
						operation: this.blending
					}
				}
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
}

export default RenderPipeline
