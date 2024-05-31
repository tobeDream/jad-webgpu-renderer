import { VariableDefinition } from 'webgpu-utils'
import { TypedArray } from '../types'
import BufferView from '@/buffer/bufferView'

type IProps = {
	name: string
	def: VariableDefinition
	value?: TypedArray
	byteLength?: number
}

/**
 * shader中 storage 变量是动态数组，没有确定的长度，所以webgpu-utils 无法为 storage 创建 typedArray，
 * 需要我们自己设置typedArray。而且 storage buffer的大小是可变的
 */
class Storage {
	protected _bufferView: BufferView
	protected _name: string
	protected _needsUpdate = true
	protected def: VariableDefinition
	protected _value?: TypedArray
	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		let size = 4
		if (props.value) {
			this._value = props.value
			size = this._value.byteLength
		} else if (props.byteLength) {
			size = props.byteLength
		}
		this._bufferView = new BufferView({
			size,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			offset: 0
		})
	}

	get name() {
		return this._name
	}

	get value() {
		return this._value
	}

	get binding() {
		return this.def.binding
	}

	get group() {
		return this.def.group
	}

	get size() {
		return this._bufferView.size
	}

	get bufferView() {
		return this._bufferView
	}

	get needsUpdate() {
		return this._needsUpdate
	}

	set needsUpdate(b: boolean) {
		this._needsUpdate = b
	}

	public updateValue(value: TypedArray) {
		this._value = value
		this._needsUpdate = true
	}

	public updateBuffer(device: GPUDevice) {
		if (this._needsUpdate && this._value) {
			const res = this.bufferView.udpateBuffer(device, this._value.buffer)
			if (res) this._needsUpdate = false
		}
	}
}

export default Storage
