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
	constructor(props: IProps) {
		const geometry = new Geometry()
		const material = new PointMaterial({ blending: props.blending })
		super(geometry, material)
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
		this.geometry.vertexCount = 6 //wgsl 中通过硬编码设置了两个三角形的顶点坐标，由此组成一个正方形代表一个可以设置尺寸的散点
	}
}

export default Points
