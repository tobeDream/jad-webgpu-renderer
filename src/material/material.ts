import BufferPool from '../buffer/bufferPool'
import { Blending } from '../types'
import Renderer from '../Renderer'
import RenderPipeline from './pipeline/renderPipeline'
import { TypedArray } from '../types'
import { Camera } from '@/camera/camera'

type IProps = {
	renderCode: string
	vertexShaderEntry?: string
	fragmentShaderEntry?: string
	uniforms?: Record<string, any>
	storages?: Record<string, TypedArray>
	blending?: Blending
	textures?: Record<string, GPUTexture>
}

class Material {
	protected renderPipeline: RenderPipeline
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
		uniform.updateValue(value)
	}

	public updateStorage(storageName: string, value: TypedArray) {
		let storage = this.renderPipeline.getStorage(storageName)
		storage.updateValue(value)
	}

	public getPipeline(renderer: Renderer, vertexBufferLayouts: GPUVertexBufferLayout[]) {
		return this.renderPipeline.getPipeline(renderer, vertexBufferLayouts)
	}

	public getBindGroups(renderer: Renderer, camera: Camera) {
		return this.renderPipeline.getBindGroups(renderer, this.bufferPool, camera)
	}
}

export default Material
