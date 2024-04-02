import { makeStructuredView } from 'webgpu-utils'
import Uniform, { IProps as UniformProps } from './uniform'

type IProps = UniformProps & {
	byteLength?: number
}

/**
 * shader中 storage 变量是动态数组，没有确定的长度，所以webgpu-utils 无法为 storage 创建 typedArray，
 * 需要我们自己设置typedArray。而且 storage buffer的大小是可变的
 */
class Storage extends Uniform {
	constructor(props: IProps) {
		super(props)
		this.initView(props, (props.byteLength || 4) / 4)
	}

	protected initView(props: IProps, size = 1) {
		console.log(this.def)
		this.setView(props.value, size)
	}

	private setView(value: any, size: number) {
		try {
			const arrayBuffer = new Uint32Array(size).buffer
			this.view = makeStructuredView(this.def, arrayBuffer)
			this.view.set(value)
		} catch (e) {
			this.setView(value, size * 2)
		}
	}

	public udpateValue(value: any, byteLength = this.byteLength) {
		this.setView(value, byteLength / 4)
		this._needsUpdate = true
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
