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
