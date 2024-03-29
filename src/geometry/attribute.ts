/* eslint-disable no-undef */
import { TypedArray } from 'localType'

type Options = {
	shaderLocation?: number
	stepMode?: GPUVertexStepMode
}

class Attribute {
	private _name: string
	private _array: TypedArray
	private _itemSize: number
	private _needUpdate = true
	private _buffer: GPUBuffer | null
	private _shaderLocation?: number
	private _stepMode: GPUVertexStepMode = 'vertex'

	constructor(name: string, data: TypedArray, itemSize: number, options?: Options) {
		this._name = name
		this._array = data
		this._itemSize = itemSize
		this._buffer = null
		this._shaderLocation = options?.shaderLocation
		if (options?.stepMode) this._stepMode = options.stepMode
	}

	get name() {
		return this._name
	}

	get shaderLocation() {
		return this._shaderLocation
	}

	set shaderLocation(l: number | undefined) {
		this._shaderLocation = l
	}

	get stepMode() {
		return this._stepMode
	}

	get array() {
		return this._array
	}

	set array(data: TypedArray) {
		this._array = data
		this._needUpdate = true
	}

	get itemSize() {
		return this._itemSize
	}

	set itemSize(v: number) {
		this._itemSize = Math.floor(v)
	}

	get buffer() {
		return this._buffer
	}

	get needsUpdate() {
		return this._needUpdate
	}

	set needsUpdate(b: boolean) {
		this._needUpdate = b
	}

	public updateBuffer(device: GPUDevice) {
		if (this._buffer) {
			this._buffer.destroy()
		}
		this._buffer = device.createBuffer({
			label: this.name + ' vertex buffer',
			size: this._array.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		})
		device.queue.writeBuffer(this._buffer, 0, this._array)
		this._needUpdate = false
	}

	public getFormat() {
		let typeStr = this._array.constructor.name.split('Array')[0].toLocaleLowerCase() //Float32, Uint8, Int8, ...
		if (typeStr.startsWith('int')) typeStr = 's' + typeStr
		if (typeStr.includes('int')) typeStr = typeStr.replace('int', 'norm')
		return (typeStr.toLocaleLowerCase() + (this.itemSize === 1 ? '' : `x${this.itemSize}`)) as GPUVertexFormat
	}

	public dispose() {
		if (this._buffer) {
			this._buffer.destroy()
		}
	}
}

export default Attribute
