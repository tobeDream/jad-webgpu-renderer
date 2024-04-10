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
		radius?: number
	}
}

class Heatmap extends Model {
	constructor(props: IProps) {
		const geometry = new Geometry()
		geometry.vertexCount = 6
		const material = new HeatmapMaterial({ points: props.points, ...props.material })

		super(geometry, material)
	}
}

export default Heatmap
