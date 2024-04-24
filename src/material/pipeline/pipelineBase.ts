import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import Renderer from '../../Renderer'
import { Blending, TypedArray } from '../../types'
import Uniform from '../uniform'
import Storage from '../storage'

export type IProps = {
	shaderCode: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
}

abstract class PipelineBase {
	protected code: string
	protected uniforms: Record<string, Uniform> = {}
	protected storages: Record<string, Storage> = {}
	protected blending: Blending = 'none'
	protected pipeline: GPUPipelineBase | null = null
	protected shaderModule: GPUShaderModule | null = null
	protected _defs: ShaderDataDefinitions

	constructor(props: IProps) {
		this.code = props.shaderCode
		this.blending = props.blending || 'none'
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

	protected abstract createPipeline(renderer: Renderer): GPUPipelineBase
	abstract getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]): GPUPipelineBase
	abstract getBindGroups(renderer: Renderer): { bindGroups: GPUBindGroup[]; groupIndexList: number[] }
}

export default PipelineBase
