import { VariableDefinition } from 'webgpu-utils'
import { TypedArray } from '../types'

type IProps = {
	name: string
	def: VariableDefinition
	value: TypedArray
}

/**
 * shader中 storage 变量是动态数组，没有确定的长度，所以webgpu-utils 无法为 storage 创建 typedArray，
 * 需要我们自己设置typedArray。而且 storage buffer的大小是可变的
 */
class Storage {
	protected _name: string
	protected _needsUpdate = true
	protected def: VariableDefinition
	protected view: TypedArray
	protected buffer: GPUBuffer | null
	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
		this.buffer = null
		this.view = props.value
	}

	get name() {
		return this._name
	}

	get value() {
		return this.view
	}

	get binding() {
		return this.def.binding
	}

	get group() {
		return this.def.group
	}

	get byteLength() {
		return this.view.byteLength
	}

	get arrayBuffer() {
		return this.view.buffer
	}

	get needsUpdate() {
		return this._needsUpdate
	}

	set needsUpdate(b: boolean) {
		this._needsUpdate = b
	}

	public udpateValue(value: TypedArray) {
		this.view = value
		this._needsUpdate = true
	}

	public replaceBuffer(buffer: GPUBuffer) {
		if (this.buffer) {
			this.buffer.destroy()
		}
		this.buffer = buffer
		this._needsUpdate = false
	}

	public getBuffer(device: GPUDevice) {
		if (!this.buffer) {
			this.createBuffer(device)
			this.updateBuffer(device)
		} else if (this._needsUpdate) {
			this.updateBuffer(device)
		}
		return this.buffer
	}

	public dispose() {
		if (this.buffer) this.buffer.destroy()
	}

	public updateBuffer(device: GPUDevice) {
		if (!this.buffer) this.createBuffer(device)
		if (!this.buffer) return
		if (this.buffer.size <= this.arrayBuffer.byteLength) this.createBuffer(device)
		device.queue.writeBuffer(this.buffer, 0, this.arrayBuffer)
		this._needsUpdate = false
	}

	protected createBuffer(device: GPUDevice) {
		if (this.buffer) this.buffer.destroy()
		this.buffer = device.createBuffer({
			size: this.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		})
	}
}

export default Storage
