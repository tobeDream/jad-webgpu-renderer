import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PointMaterial from './material/PointMaterial'
import Model from './Model'
import { Blending } from 'localType'

type IProps = {
	positions: Float32Array
	sizes: Float32Array
	colors: Uint8Array
	blending?: Blending
}

class Points extends Model {
	private geo: Geometry
	private mat: PointMaterial
	constructor(props: IProps) {
		const geometry = new Geometry()
		const material = new PointMaterial({ blending: props.blending })
		super(geometry, material)
		this.geo = geometry
		this.mat = material
		this.initAttributes(props)
	}

	private initAttributes(props: IProps) {
		const positionAttribute = new Attribute('position', props.positions, 2, {
			stepMode: 'instance',
			shaderLocation: 0
		})
		const sizeAttribute = new Attribute('size', props.sizes, 1, { stepMode: 'instance', shaderLocation: 1 })
		const colorAttribute = new Attribute('color', props.colors, 4, { stepMode: 'instance', shaderLocation: 2 })
		this.geometry.setAttribute('position', positionAttribute)
		this.geometry.setAttribute('size', sizeAttribute)
		this.geometry.setAttribute('color', colorAttribute)
	}
}

export default Points
