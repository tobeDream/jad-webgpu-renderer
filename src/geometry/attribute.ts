/* eslint-disable no-undef */
import BufferView from '@/buffer/bufferView'
import { TypedArray } from '../types'
import BufferPool from '@/buffer/bufferPool'

type Options = {
	shaderLocation?: number
	stepMode?: GPUVertexStepMode
	capacity?: number
}

class Attribute {
	private _name: string
	private _array: TypedArray
	private _itemSize: number
	private _bufferView: BufferView
	private _shaderLocation?: number
	private _stepMode: GPUVertexStepMode = 'vertex'

	constructor(name: string, data: TypedArray, itemSize: number, options?: Options) {
		this._name = name
		this._array = data
		this._itemSize = itemSize
		this._shaderLocation = options?.shaderLocation
		if (options?.stepMode) this._stepMode = options.stepMode
		this._bufferView = new BufferView({
			resourceName: 'attribute_' + this._name,
			offset: 0,
			size: options?.capacity ? options.capacity * this._array.BYTES_PER_ELEMENT : this._array.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		})
		if (options?.capacity) {
			this.reallocate(options.capacity)
		}
	}

	get needsUpdate() {
		return this._bufferView.needsUpdate
	}

	set needsUpdate(v: boolean) {
		this._bufferView.needsUpdate = v
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
		this.needsUpdate = true
	}

	get itemSize() {
		return this._itemSize
	}

	set itemSize(v: number) {
		this._itemSize = Math.floor(v)
	}

	get bufferView() {
		return this._bufferView
	}

	public updateBuffer(device: GPUDevice, bufferPool: BufferPool) {
		if (this.needsUpdate) {
			const res = this.bufferView.updateBuffer(device, this._array, bufferPool)
			if (res) this.needsUpdate = false
		}
	}

	public getFormat() {
		let typeStr = this._array.constructor.name.split('Array')[0].toLocaleLowerCase() //Float32, Uint8, Int8, ...
		if (typeStr.startsWith('int')) typeStr = 's' + typeStr
		// if (typeStr.includes('int')) typeStr = typeStr.replace('int', 'norm')
		return (typeStr.toLocaleLowerCase() + (this.itemSize === 1 ? '' : `x${this.itemSize}`)) as GPUVertexFormat
	}

	public reallocate(size: number) {
		//@ts-ignore
		const newArray = new this._array.constructor(size) as typeof this._array
		newArray.set(this._array.subarray(0, size))
		this._array = newArray
		this.needsUpdate = true
	}

	public dispose() {
		//@ts-ignore
		this._array = undefined
		this._bufferView.dispose()
	}
}

export default Attribute
