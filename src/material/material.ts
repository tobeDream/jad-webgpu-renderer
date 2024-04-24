import { ShaderDataDefinitions, makeShaderDataDefinitions } from 'webgpu-utils'
import { Blending } from '../types'
import Renderer from '../Renderer'
import RenderPipeline from './pipeline/renderPipeline'
import Uniform from './uniform'
import Storage from './storage'
import { TypedArray } from '../types'

type IProps = {
	renderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
}

class Material {
	protected renderPipeline: RenderPipeline

	constructor(props: IProps) {
		this.renderPipeline = new RenderPipeline({
			vsEntry: props.vertexShaderEntry || 'vs',
			fsEntry: props.fragmentShaderEntry || 'fs',
			shaderCode: props.renderCode,
			uniforms: props.uniforms,
			storages: props.storages,
			blending: props.blending
		})
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
		const uniform = this.renderPipeline.getUniform(uniformName)
		if (!uniform) return
		uniform.updateValue(value)
	}

	public updateStorage(storageName: string, value: TypedArray) {
		const storage = this.renderPipeline.getStorage(storageName)
		if (!storage) return
		storage.updateValue(value)
	}

	public replaceStorageBuffer(sn: string, buffer: GPUBuffer) {
		const storage = this.renderPipeline.getStorage(sn)
		if (storage) {
			storage.replaceBuffer(buffer)
		}
	}

	public getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		return this.renderPipeline.getPipeline(renderer, vertexBufferLayouts)
	}

	public getBindGroups(renderer: Renderer) {
		return this.renderPipeline.getBindGroups(renderer)
	}

	public recordComputeCommand(renderer: Renderer) {}
}

export default Material
