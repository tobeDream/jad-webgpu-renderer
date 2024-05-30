import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PathMaterial from './material/pathMaterial'
import Model from './Model'
import { Blending, Color } from './types'

type IProps = {
	positions: Float32Array
	material?: {
		color?: Color
		lineWidth?: number
		blending?: Blending
	}
}

class Path extends Model {
	constructor(props: IProps) {
		const res = Path.extendLineToMesh(props.positions)
		if (!res) return
		const { indexArr } = res

		const geometry = new Geometry()
		const material = new PathMaterial({
			...props.material,
			positions: props.positions
		})

		super(geometry, material)

		this.geometry.setIndex(indexArr)
	}

	private static extendLineToMesh(positions: Float32Array) {
		const s = new Date().valueOf()
		const count = positions.length / 2
		if (count < 2) return null
		const indexArr = new Uint32Array((count - 1) * 6)

		for (let i = 0; i < count; ++i) {
			indexArr[i * 6 + 0] = i
			indexArr[i * 6 + 1] = i + 1
			indexArr[i * 6 + 2] = i + 1 + count
			indexArr[i * 6 + 3] = i
			indexArr[i * 6 + 4] = i + 1 + count
			indexArr[i * 6 + 5] = i + count
		}

		console.log(new Date().valueOf() - s)
		return { indexArr }
	}
}

export default Path
