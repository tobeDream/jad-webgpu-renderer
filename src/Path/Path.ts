import Geometry from '../geometry/geometry'
import PathMaterial from '../material/pathMaterial'
import Model from '../Model'
import { Blending, Color } from '../types'

export const defaultStyle = {
	color: [1, 0, 0, 0.7] as Color,
	lineWidth: 5,
	unplayedColor: [0, 0, 0, 0.05] as Color,
	unplayedLineWidth: 5,
	tailDuration: 100,
	headPointVisible: false,
	headPointSize: 15,
	drawLine: false,
	speedColorList: [
		[0, 1, 0, 60],
		[0, 0, 1, 30],
		[1, 0, 0, 0],
	] as Color[],
	colorBySpeed: false,
}

export type Style = {
	color?: Color
	lineWidth?: number
	unplayedColor?: Color
	unplayedLineWidth?: number
	blending?: Blending
	tailDuration?: number
	speedColorList?: Color[]
	headPointVisible?: boolean
	headPointColor?: Color
	headPointSize?: number
	drawLine?: boolean
	colorBySpeed?: boolean
}

export type IProps = {
	pathId: string
	position: Float32Array
	startTime?: Float32Array
	style?: Style
}

export class Path extends Model {
	constructor(props: IProps) {
		const style = props.style || {}
		const drawLine = !!style.drawLine

		const geometry = new Geometry()
		const material = new PathMaterial({
			...style,
			position: props.position,
			startTime: props.startTime,
			drawLine,
		})

		super(geometry, material)

		this._id = props.pathId
		this.changeDrawLine(drawLine, props.position)
	}

	get material() {
		return this._material as PathMaterial
	}

	get positions() {
		return this.material.getStorage('positions')?.value as Float32Array
	}

	get startTimes() {
		return this.material.getStorage('startTimes')?.value as Float32Array | null
	}

	get drawLine() {
		return this.material.primitive?.topology === 'line-strip'
	}

	public changeDrawLine(drawLine: boolean, position: Float32Array) {
		if (!drawLine) {
			//将 position 和 startTime 等 attribute 放在storage 中，可以节省一半的显存开销，因为 Path 面两侧顶点的 position 和 startTime 是一样的。
			//只需要通过 vertex_index 从 storage 中获取对应的 position 和 startTime 即可，
			//这样可以保证无论是 line-strip还是 triangle-list 模式渲染，position 和 startTime 存储方式和 vs 中访问的方式不变
			const pathIndexRes = Path.extendLineToMesh(position)
			if (!pathIndexRes) return
			const { indexArr } = pathIndexRes
			this.geometry.setIndex(indexArr)
		} else {
			const index = this.geometry.getIndex()
			if (index) {
				this.geometry.setIndex(undefined)
			}
			this.geometry.vertexCount = position.length / 2
		}
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

		return { indexArr }
	}
}
