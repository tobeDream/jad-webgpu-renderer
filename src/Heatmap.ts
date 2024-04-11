import Model from './Model'
import Geometry from './geometry/geometry'
import HeatmapMaterial from './material/heatmapMaterial'
import { Color } from './types'

type IProps = {
	points: Float32Array
	material?: {
		colorList?: [Color, Color, Color, Color, Color]
		offsets?: [number, number, number, number, number]
		maxHeatValue?: number
		maxHeatValueRatio?: number
		radius?: number
	}
}

class Heatmap extends Model {
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
		const material = new HeatmapMaterial({ points: props.points, ...props.material })

		super(geometry, material)
	}
}

export default Heatmap
