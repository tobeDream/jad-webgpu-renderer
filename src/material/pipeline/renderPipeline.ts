import PipelineBase, { IProps } from './pipelineBase'
import Renderer from '@/Renderer'

class RenderPipeline extends PipelineBase {
	protected pipeline: GPURenderPipeline | null = null
	constructor(props: IProps) {
		super(props)
	}

	protected createPipeline(renderer: Renderer): GPURenderPipeline {}

	getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]): GPURenderPipeline {
		const { device } = renderer
		return device.createRenderPipeline()
	}

	getBindGroups(renderer: Renderer): { bindGroups: GPUBindGroup[]; groupIndexList: number[] } {
		return { bindGroups: [], groupIndexList: [] }
	}
}

export default RenderPipeline
