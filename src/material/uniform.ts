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
	protected buffer: GPUBuffer | null

	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		this.buffer = null
		this.initView(props)
	}

	get name() {
		return this._name
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

	public udpateValue(value: any) {
		this.view.set(value)
	}

	public getBuffer(device: GPUDevice) {
		if (!this.buffer) this.createBuffer(device)
		return this.buffer
	}

	public dispose() {
		if (this.buffer) this.buffer.destroy()
	}

	public updateBuffer(device: GPUDevice) {
		if (!this.buffer) this.createBuffer(device)
		if (!this.buffer) return
		device.queue.writeBuffer(this.buffer, 0, this.arrayBuffer)
	}

	protected initView(props: IProps) {
		this.view = makeStructuredView(this.def)
		this.view.set(props.value)
	}

	protected createBuffer(device: GPUDevice) {
		if (this.buffer) this.buffer.destroy()
		this.buffer = device.createBuffer({
			size: this.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		})
	}
}

export default Uniform
