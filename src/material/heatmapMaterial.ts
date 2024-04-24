import Material from './material'
import Renderer from '../Renderer'
import { Color } from '../types'
import { renderShaderCode, computeShaderCode, computeMaxHeatValueShaderCode, heatValuePrec } from './shaders/heatmap'

type IProps = {
	points: Float32Array
	colorList?: [Color, Color, Color, Color, Color]
	offsets?: [number, number, number, number, number]
	maxHeatValue?: number
	maxHeatValueRatio?: number
	radius?: number
}

class HeatmapMaterial extends Material {
	private maxHeatValue: number
	private maxHeatValueRatio = 1
	private radius = 25
	private points = new Float32Array([])
	private colorList: Float32Array
	private offsetList: Float32Array

	constructor(props: IProps) {
		super({
			renderCode: renderShaderCode,
			blending: 'normalBlending'
		})
		this.colorList = props.colorList
			? new Float32Array(props.colorList.flat())
			: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
		this.offsetList = props.offsets ? new Float32Array(props.offsets) : new Float32Array([1, 0.85, 0.55, 0.35, 0])
		this.maxHeatValue = props.maxHeatValue || 1
		if (props.maxHeatValueRatio) this.maxHeatValueRatio = props.maxHeatValueRatio
		this.points = props.points
		this.radius = props.radius || 15
		this.updateUniform('maxHeatValue', props.maxHeatValue === undefined ? -1 : this.maxHeatValue)
		this.updateUniform('maxHeatValueRatio', this.maxHeatValueRatio)
		this.updateUniform('colors', this.colorOffsets)
	}

	get colorOffsets() {
		const res = new Float32Array(4 * 4)
		for (let i = 0; i < 4; ++i) {
			res[i * 4 + 0] = this.colorList[i * 3 + 0]
			res[i * 4 + 1] = this.colorList[i * 3 + 1]
			res[i * 4 + 2] = this.colorList[i * 3 + 2]
			res[i * 4 + 3] = this.offsetList[i]
		}
		return res
	}

	public recordComputeCommand(renderer: Renderer) {
		const device = renderer.device
		const num = this.points.length / 2
		const computeShaderModule = device.createShaderModule({
			label: 'compute shader demo',
			code: computeShaderCode
		})

		const pipeline = device.createComputePipeline({
			label: 'compute pipeline demo',
			layout: 'auto',
			compute: {
				module: computeShaderModule,
				entryPoint: 'main'
			}
		})

		const uniformUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		const radiusValue = new Float32Array([this.radius])
		const radiusBuffer = device.createBuffer({
			label: 'Radius Uniforms',
			size: radiusValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(radiusBuffer, 0, radiusValue)

		const countX = Math.ceil(num ** 0.5)
		const countY = Math.ceil(num / countX)
		const gridValue = new Uint32Array([countX, countY])
		const gridBuffer = device.createBuffer({
			label: 'Grid Uniforms',
			size: gridValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(gridBuffer, 0, gridValue)

		const resolution = [renderer.width, renderer.height]
		const resolutionValue = new Float32Array(resolution)
		const resolutionBuffer = device.createBuffer({
			label: 'Resolution Uniforms',
			size: resolutionValue.byteLength,
			usage: uniformUsage
		})
		device.queue.writeBuffer(resolutionBuffer, 0, resolutionValue)

		const inputBuffer = device.createBuffer({
			label: 'input storage buffer',
			size: this.points.byteLength,
			usage: storageUsage
		})
		device.queue.writeBuffer(inputBuffer, 0, this.points)

		const outputBuffer = device.createBuffer({
			label: 'output storage buffer',
			size: resolution[0] * resolution[1] * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
		})
		this.replaceStorageBuffer('heatValueArr', outputBuffer)

		const readBuffer = device.createBuffer({
			label: 'unmaped buffer',
			size: outputBuffer.size,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
		})

		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: inputBuffer } },
				{ binding: 1, resource: { buffer: outputBuffer } },
				{ binding: 2, resource: { buffer: gridBuffer } },
				{ binding: 3, resource: { buffer: resolutionBuffer } },
				{ binding: 4, resource: { buffer: radiusBuffer } },
				{ binding: 5, resource: { buffer: renderer.precreatedUniformBuffers['projectionMatrix'] } },
				{ binding: 6, resource: { buffer: renderer.precreatedUniformBuffers['viewMatrix'] } }
			]
		})

		const computeMaxValueShaderModule = device.createShaderModule({
			label: 'compute  max heat value shader',
			code: computeMaxHeatValueShaderCode
		})

		const computeMaxValuePipeline = device.createComputePipeline({
			label: 'compute max heat value pipeline',
			layout: 'auto',
			compute: {
				module: computeMaxValueShaderModule,
				entryPoint: 'main'
			}
		})
		const maxValueBuffer = device.createBuffer({
			label: 'maxValue buffer',
			size: 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
		})
		device.queue.writeBuffer(maxValueBuffer, 0, new Float32Array([0]))
		this.replaceStorageBuffer('actualMaxHeatValue', maxValueBuffer)

		const computeMaxValueBindGroup = device.createBindGroup({
			layout: computeMaxValuePipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: outputBuffer } },
				{ binding: 1, resource: { buffer: maxValueBuffer } },
				{ binding: 2, resource: { buffer: resolutionBuffer } }
			]
		})

		const encoder = device.createCommandEncoder()
		const computePass = encoder.beginComputePass()
		computePass.setPipeline(pipeline)
		computePass.setBindGroup(0, bindGroup)
		computePass.dispatchWorkgroups(countX, countY)

		computePass.setPipeline(computeMaxValuePipeline)
		computePass.setBindGroup(0, computeMaxValueBindGroup)
		computePass.dispatchWorkgroups(resolution[1], 1)

		computePass.end()

		const commandBuffer = encoder.finish()
		device.queue.submit([commandBuffer])
	}
}

export default HeatmapMaterial
