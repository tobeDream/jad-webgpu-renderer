import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PointMaterial from './material/PointMaterial'
import Model from './Model'

type IProps = {
	positions: Float32Array
	sizes?: Float32Array
	colors?: Uint8Array
}

class Points extends Model {
	private geo: Geometry
	private mat: PointMaterial
	constructor(props: IProps) {
		const geometry = new Geometry()
		const material = new PointMaterial({})
		super(geometry, material)
		this.geo = geometry
		this.mat = material
	}
}
