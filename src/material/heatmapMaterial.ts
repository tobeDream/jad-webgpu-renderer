import Material from './material'
import { Color } from '../types'
import { renderShaderCode } from './shaders/heatmap'

type IProps = {
	colorList?: [Color, Color, Color, Color, Color]
	offsets?: [number, number, number, number, number]
	maxHeatValue?: number
	maxHeatValueRatio?: number
	radius?: number
}

class HeatmapMaterial extends Material {
	private maxHeatValue: number
	private maxHeatValueRatio = 1
	private colorList: Float32Array
	private offsetList: Float32Array

	constructor(props: IProps) {
		super({ renderCode: renderShaderCode, blending: 'normalBlending' })
		this.colorList = props.colorList
			? new Float32Array(props.colorList.flat())
			: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
		this.offsetList = props.offsets ? new Float32Array(props.offsets) : new Float32Array([1, 0.85, 0.55, 0.35, 0])
		this.maxHeatValue = props.maxHeatValue || 1
		if (props.maxHeatValueRatio) this.maxHeatValueRatio = props.maxHeatValueRatio
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
}

export default HeatmapMaterial
