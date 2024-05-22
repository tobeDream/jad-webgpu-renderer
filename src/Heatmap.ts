import Model from './Model'
import Geometry from './geometry/geometry'
import Material from './material/material'
import { Color } from './types'
import { renderShaderCode } from './material/shaders/heatmap'
import Renderer from './Renderer'
import { Camera } from './camera/camera'

type IProps = {
	points: Float32Array
	material?: {
		colorList?: [Color, Color, Color, Color, Color]
		offsets?: [number, number, number, number, number]
		maxHeatValueRatio?: number
		radius?: number
	}
}

class Heatmap extends Model {
	private colorList: Float32Array
	private offsetList: Float32Array
	private maxHeatValueRatio: number
	private points: Float32Array
	private radius: number
	/**
	 * points 为热力点的二维坐标
	 * material.colorList 为将浮点数的热力值插值为 rgb 颜色时的插值颜色数组
	 * material.offsets 为颜色插值时各个颜色对应的区间取值为1到0，降序
	 * material.radius 为热力点的像素半径
	 * maetrial.maxHeatValue 计算出来的各个像素的实际热力值可能大于1，在render pipeline中对各个像素上的热力值进行颜色插值时需要通过 maxHeatValue 对像素的热力值进行归一化，如果 maxHeatValue 没有设置，则会在 compute shader中统计各个像素的热力值，取最大值用来对像素热力值归一化
	 * material.maxHeatValueRatio (0, 1]，maxHeatValue 对像素热力值做归一化时需先乘以该值
	 * @param props
	 */
	constructor(props: IProps) {
		const geometry = new Geometry()
		geometry.vertexCount = 6
		const { material, points } = props
		const mat = new Material({
			renderCode: renderShaderCode,
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: 'normalBlending'
		})

		super(geometry, mat)

		this.colorList = material?.colorList
			? new Float32Array(material.colorList.flat())
			: new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
		this.offsetList = material?.offsets
			? new Float32Array(material?.offsets)
			: new Float32Array([1, 0.85, 0.55, 0.35, 0])

		this.maxHeatValueRatio = material?.maxHeatValueRatio || 1
		this.material.updateUniform('maxHeatValueRatio', this.maxHeatValueRatio)
		this.material.updateUniform('colors', this.colorOffsets)

		this.points = points
		this.radius = material?.radius || 10
	}

	private createHeatValueTexture(renderer: Renderer) {
		const { device, width, height } = renderer

		const heatValueTexture = device.createTexture({
			size: [width, height, 1],
			format: 'rgba16float',
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		})
		this.material.updateTexture('heatValTex', heatValueTexture)
	}

	private createHeatPointsModel() {}

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

	public render(renderer: Renderer, encoder: GPUCommandEncoder, pass: GPURenderPassEncoder, camera: Camera): void {}
}

export default Heatmap
