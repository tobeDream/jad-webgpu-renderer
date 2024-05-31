import Renderer from './Renderer'
import { Camera } from './camera/camera'

export type TypedArray =
	| Float32Array
	| Float64Array
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| Int8Array
	| Int16Array
	| Int32Array

export type Blending = 'normalBlending' | 'additiveBlending' | 'max' | 'min' | 'none'

export type Color = [number, number, number, number]

export interface IRenderable {
	prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera): void

	render(renderer: Renderer, pass: GPURenderPassEncoder, camera: Camera, textures?: Record<string, GPUTexture>): void

	get visible(): boolean

	set visible(v: boolean)

	get renderOrder(): number

	set renderOrder(r: number)
}
