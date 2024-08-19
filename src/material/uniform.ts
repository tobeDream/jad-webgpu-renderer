/* eslint-disable no-undef */
import BufferPool from '@/buffer/bufferPool'
import BufferView from '@/buffer/bufferView'
import { makeStructuredView, StructuredView, VariableDefinition } from 'webgpu-utils'

export type IProps = {
	name: string
	def: VariableDefinition
	value: any
}

class Uniform {
	protected _name: string
	protected def: VariableDefinition
	protected view: StructuredView
	protected _value: any
	protected _bufferView: BufferView

	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		this._value = props.value
		this.view = makeStructuredView(this.def)
		this.view.set(props.value)
		this._bufferView = new BufferView({
			resourceName: this._name,
			offset: 0,
			size: this.view.arrayBuffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
		return this._bufferView.needsUpdate
	}

	set needsUpdate(v: boolean) {
		this._bufferView.needsUpdate = v
	}

	public updateValue(value: any) {
		this.view.set(value)
		this._value = value
		this.needsUpdate = true
	}

	public updateBuffer(device: GPUDevice, bufferPool: BufferPool) {
		if (this.needsUpdate && this.view.arrayBuffer) {
			const res = this.bufferView.updateBuffer(device, this.view.arrayBuffer, bufferPool)
			if (res) this.needsUpdate = false
		}
	}

	dispose() {
		this.bufferView.dispose()
		this._value = undefined
	}
}

export default Uniform
