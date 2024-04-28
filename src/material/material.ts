import BufferPool from '../buffer/bufferPool'
import { Blending } from '../types'
import Renderer from '../Renderer'
import RenderPipeline from './pipeline/renderPipeline'
import ComputePipeline from './pipeline/computePipeline'
import { TypedArray } from '../types'

type IProps = {
	renderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
	computeList?: {
		entry?: string
		code: string
		workgroupCount: { x: number; y: number; z: number }
		uniforms?: Record<string, any>
		storages?: Record<string, any>
	}[]
}

class Material {
	protected renderPipeline: RenderPipeline
	protected computePipelines: ComputePipeline[] = []
	protected bufferPool = new BufferPool()

	constructor(props: IProps) {
		this.renderPipeline = new RenderPipeline({
			vsEntry: props.vertexShaderEntry || 'vs',
			fsEntry: props.fragmentShaderEntry || 'fs',
			shaderCode: props.renderCode,
			uniforms: props.uniforms,
			storages: props.storages,
			blending: props.blending
		})
		this.createComputePipelines(props.computeList)
	}

	private createComputePipelines(computeList: IProps['computeList']) {
		if (!computeList) return
		for (let item of computeList) {
			const { workgroupCount, uniforms, storages, entry, code } = item
			this.computePipelines.push(
				new ComputePipeline({
					computeEntry: entry || 'main',
					shaderCode: code,
					workgroupCount,
					uniforms,
					storages
				})
			)
		}
	}

	public getUniform(name: string) {
		const uniform = this.renderPipeline.getUniform(name)
		return uniform
	}

	public getStorage(name: string) {
		const storage = this.renderPipeline.getStorage(name)
		return storage
	}

	public updateUniform(uniformName: string, value: any) {
		let uniform = this.renderPipeline.getUniform(uniformName)
		if (!uniform) {
			for (let item of this.computePipelines) {
				uniform = item.getUniform(uniformName)
				if (uniform) break
			}
		}
		uniform.updateValue(value)
	}

	public updateStorage(storageName: string, value: TypedArray) {
		let storage = this.renderPipeline.getStorage(storageName)
		if (!storage) {
			for (let item of this.computePipelines) {
				storage = item.getStorage(storageName)
				if (storage) break
			}
		}
		storage.updateValue(value)
	}

	public getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		return this.renderPipeline.getPipeline(renderer, vertexBufferLayouts)
	}

	public getBindGroups(renderer: Renderer) {
		return this.renderPipeline.getBindGroups(renderer, this.bufferPool)
	}

	public submitComputeCommand(renderer: Renderer, encoder: GPUCommandEncoder) {
		if (this.computePipelines.length === 0) return
		const s = new Date().valueOf()
		const heatValueArrBuffer = this.bufferPool.getBuffer('heatValueArr')
		if (heatValueArrBuffer) {
			encoder.clearBuffer(heatValueArrBuffer.GPUBuffer)
		}
		const computePass = encoder.beginComputePass()
		for (let item of this.computePipelines) {
			const pipeline = item.getPipeline(renderer)
			const { bindGroups, groupIndexList } = item.getBindGroups(renderer, this.bufferPool)
			if (!pipeline) continue
			computePass.setPipeline(pipeline)
			for (let i = 0; i < bindGroups.length; ++i) {
				computePass.setBindGroup(groupIndexList[i], bindGroups[i])
			}
			const { x, y, z } = item.workgroupCount
			computePass.dispatchWorkgroups(x, y, z)
		}
		computePass.end()
	}

	public onresize(renderer: Renderer) {}
}

export default Material
