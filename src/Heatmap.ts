import Model from './Model'
import Geometry from './geometry/geometry'
import HeatmapMaterial from './material/heatmapMaterial'
import { Color } from './types'

type IProps = {
	points: Float32Array
	material?: {
		colorList?: [Color, Color, Color, Color, Color]
		offsets?: [number, number, number, number, number]
		maxHeatValue?: number | ((maxValue: number) => number)
		radius?: number
	}
}

class Heatmap extends Model {
	/**
	 * points 为热力点的二维坐标
	 * material.colorList 为将浮点数的热力值插值为 rgb 颜色时的插值颜色数组
	 * material.offsets 为颜色插值时各个颜色对应的区间取值为1到0，降序
	 * material.radius 为热力点的像素半径
	 * maetrial.maxHeatValue 为所有像素中热力值的最大值，在颜色插值时会将像素的热力值除以该值，设置为函数时，参数为当前所有像素的热力值最大值
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
