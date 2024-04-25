import { VariableDefinition } from 'webgpu-utils'
import { TypedArray } from '../types'

type IProps = {
	name: string
	def: VariableDefinition
} & (
	| {
			value: TypedArray
	  }
	| { byteLength: number }
)

/**
 * shader中 storage 变量是动态数组，没有确定的长度，所以webgpu-utils 无法为 storage 创建 typedArray，
 * 需要我们自己设置typedArray。而且 storage buffer的大小是可变的
 */
class Storage {
	protected _name: string
	protected _needsUpdate = true
	protected def: VariableDefinition
	protected _value: TypedArray
	protected _size = 0
	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		if ('value' in props) {
			this._value = props.value
		}
		if ('byteLength' in props) {
			this._size = props.byteLength
		}
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

	get byteLength() {
		return this._value?.byteLength || this._size
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
}

export default Storage
