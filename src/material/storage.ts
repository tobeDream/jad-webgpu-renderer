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
	protected buffer: GPUBuffer | null = null
	constructor(props: IProps) {
		this._name = props.name
		this.def = props.def
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

	public updateValue(value: TypedArray) {
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
		} else if (this._needsUpdate) {
			this.updateBuffer(device)
		}
		return this.buffer
	}

	public updateBuffer(device: GPUDevice) {
		if (!this.buffer) this.createBuffer(device)
		if (!this.buffer) return
		device.queue.writeBuffer(this.buffer, 0, this.arrayBuffer)
		this._needsUpdate = false
	}

	protected createBuffer(device: GPUDevice) {
		if (this.buffer) this.buffer.destroy()
		this.buffer = device.createBuffer({
			size: this.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		})
		device.queue.writeBuffer(this.buffer, 0, this.arrayBuffer)
	}

	public dispose() {
		if (this.buffer) this.buffer.destroy()
	}
}

export default Storage
