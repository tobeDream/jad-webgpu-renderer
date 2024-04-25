import PipelineBase, { IProps as BaseProps } from './pipelineBase'
import Renderer from '../../Renderer'

type IProps = BaseProps & {
	computeEntry: string
	workgroupCount: { x: number; y: number; z: number }
}

class ComputePipeline extends PipelineBase {
	private entry: string
	protected pipeline: GPUComputePipeline | null = null
	protected _workgroupCount: { x: number; y: number; z: number }

	constructor(props: IProps) {
		super(props)
		this.entry = props.computeEntry
		this._workgroupCount = props.workgroupCount
	}

	get workgroupCount() {
		return this._workgroupCount
	}

	setWorkgroupCount(x: number, y: number, z: number) {
		this._workgroupCount.x = x
		this._workgroupCount.y = y
		this._workgroupCount.z = z
	}

	private createPipeline(device: GPUDevice) {
		if (!this.shaderModule)
			this.shaderModule = device.createShaderModule({
				code: this.code
			})
		this.pipeline = device.createComputePipeline({
			layout: 'auto',
			compute: {
				module: this.shaderModule,
				entryPoint: this.entry
			}
		})
	}

	getPipeline(renderer: Renderer) {
		if (!this.pipeline) this.createPipeline(renderer.device)
		return this.pipeline
	}
}

export default ComputePipeline
