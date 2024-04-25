/* eslint-disable no-undef */
import { makeStructuredView, StructuredView, VariableDefinition } from 'webgpu-utils'

export type IProps = {
	name: string
	def: VariableDefinition
	value: any
}

class Uniform {
	protected _name: string
	protected _needsUpdate = true
	protected def: VariableDefinition
	protected view: StructuredView
	protected _value: any

	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		this._value = props.value
		this.view = makeStructuredView(this.def)
		this.view.set(props.value)
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
		return this.view.arrayBuffer.byteLength
	}

	get arrayBuffer() {
		return this.view.arrayBuffer
	}

	set arrayBuffer(ab: ArrayBuffer) {
		this.view.arrayBuffer = ab
	}

	get needsUpdate() {
		return this._needsUpdate
	}

	set needsUpdate(b: boolean) {
		this._needsUpdate = b
	}

	public updateValue(value: any) {
		this.view.set(value)
		this._value = value
		this._needsUpdate = true
	}
}

export default Uniform
