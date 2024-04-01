import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import LineMaterial from './material/lineMaterial'
import Model from './Model'
import { Blending } from 'localType'
import { Vector2 } from 'three'

type IProps = {
	positions: Float32Array
	material?: {
		color?: [number, number, number, number]
		blending?: Blending
	}
}

class Line extends Model {
	constructor(props: IProps) {
		const geometry = new Geometry()
		const material = new LineMaterial({
			...props.material
		})
		super(geometry, material)
		this.initAttributes(props)
	}

	private initAttributes(props: IProps) {
		const res = this.extendLineToMesh(props.positions)
		if (!res) return
		const { posArr, indexArr, angleArr } = res
		const positionAttribute = new Attribute('position', posArr, 2, { shaderLocation: 0 })
		const angleAttribute = new Attribute('angle', angleArr, 1, { shaderLocation: 1 })
		this.geometry.setAttribute('position', positionAttribute)
		this.geometry.setAttribute('angle', angleAttribute)
		this.geometry.vertexCount = (props.positions.length / 2 - 1) * 6
		this.geometry.setIndex(indexArr)
	}

	private extendLineToMesh(positions: Float32Array) {
		const count = positions.length / 2
		if (count < 2) return null
		const posArr = new Float32Array(count * 2 * 2)
		const indexArr = new Uint32Array((count - 1) * 6)
		const angleArr = new Float32Array(count * 2)
		const cornerList = new Float32Array(count)

		const fp = new Vector2(positions[0], positions[1])
		const sp = new Vector2(positions[2], positions[3])
		angleArr[0] = new Vector2(fp.y - sp.y, sp.x - fp.x).angle()
		cornerList[0] = Math.PI
		for (let i = 1; i < count - 1; ++i) {
			const pp = new Vector2(positions[(i - 1) * 2], positions[(i - 1) * 2 + 1])
			const p = new Vector2(positions[i * 2], positions[i * 2 + 1])
			const np = new Vector2(positions[(i + 1) * 2], positions[(i + 1) * 2 + 1])
			const nv = new Vector2(np.x - p.x, np.y - p.y)
			const pv = new Vector2(pp.x - p.x, pp.y - p.y)
			const corner = (pv.angle() - nv.angle() + Math.PI * 2) % (Math.PI * 2)
			const angle = (nv.angle() + corner / 2) % (Math.PI * 2)
			angleArr[i] = angle
			cornerList[i] = corner
		}
		angleArr[count - 1] = new Vector2(
			positions[count - 3] - positions[count - 1],
			positions[count * 2 - 2] - positions[count * 2 - 4]
		).angle()
		cornerList[count - 1] = Math.PI

		for (let i = count; i < 2 * count; ++i) {
			angleArr[i] = (angleArr[i - count] + Math.PI) % (Math.PI * 2)
		}

		let lineWidth = 3
		console.log(cornerList)
		for (let i = 0; i < count; ++i) {
			const angle = angleArr[i]
			const corner = cornerList[i]
			const p = new Vector2(positions[i * 2], positions[i * 2 + 1])
			const v = new Vector2(Math.cos(angle), Math.sin(angle))
			const width = lineWidth / Math.abs(Math.sin(corner / 2))
			console.log(width)
			v.multiplyScalar(width)
			const leftP = p.clone().add(v)
			const rightP = p.clone().sub(v)
			posArr[i * 2 + 0] = leftP.x //矩形顶点i
			posArr[i * 2 + 1] = leftP.y
			posArr[(i + count) * 2 + 0] = rightP.x //矩形顶点count + i
			posArr[(i + count) * 2 + 1] = rightP.y
			indexArr[i * 6 + 0] = i
			indexArr[i * 6 + 1] = i + 1
			indexArr[i * 6 + 2] = i + 1 + count
			indexArr[i * 6 + 3] = i
			indexArr[i * 6 + 4] = i + 1 + count
			indexArr[i * 6 + 5] = i + count
		}

		console.log(posArr, indexArr, angleArr)

		return { posArr, indexArr, angleArr }
	}
}

export default Line
