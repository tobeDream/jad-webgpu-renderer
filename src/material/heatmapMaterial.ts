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
	private points = new Float32Array([])
	private colorList: Float32Array
	private offsetList: Float32Array

	constructor(props: IProps) {
		super({
			renderCode: renderShaderCode,
			blending: 'normalBlending',
			computeList: [
				{
					code: computeShaderCode,
					entry: 'main',
					workgroupCount: { x: 1, y: 1, z: 1 },
					uniforms: { radius: props.radius || 15 },
					storages: { points: props.points }
				},
				{
					code: computeMaxHeatValueShaderCode,
					entry: 'main',
					workgroupCount: { x: 1, y: 1, z: 1 }
				}
			]
		})
		this.colorList = props.colorList
			? new Float32Array(props.colorList.flat())
			: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
		this.offsetList = props.offsets ? new Float32Array(props.offsets) : new Float32Array([1, 0.85, 0.55, 0.35, 0])
		this.maxHeatValue = props.maxHeatValue || 1
		if (props.maxHeatValueRatio) this.maxHeatValueRatio = props.maxHeatValueRatio
		this.points = props.points
		this.updateUniform('maxHeatValue', props.maxHeatValue === undefined ? -1 : this.maxHeatValue)
		this.updateUniform('maxHeatValueRatio', this.maxHeatValueRatio)
		this.updateUniform('colors', this.colorOffsets)
		// this.updateUniform('resolution_', [1215, 959])

		const num = this.points.length / 2
		const countX = Math.ceil(num ** 0.5)
		const countY = Math.ceil(num / countX)
		this.updateUniform('grid', [countX, countY])
		this.computePipelines[0].setWorkgroupCount(Math.ceil(countX / 8), Math.ceil(countY / 8), 1)

		this.getStorage('actualMaxHeat').byteLength = 4
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

	public onresize(renderer: Renderer): void {
		const { width, height, device } = renderer
		const heatValueArrStorageSize = width * height * 4
		this.bufferPool.addBuffer({
			device,
			id: 'heatValueArr',
			size: heatValueArrStorageSize,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		})
		this.computePipelines[1].setWorkgroupCount(height, 1, 1)
	}
}

export default HeatmapMaterial
