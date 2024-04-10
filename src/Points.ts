import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PointMaterial from './material/pointMaterial'
import Model from './Model'
import { Blending, Color } from './types'

type IProps = {
	positions: Float32Array
	sizes?: Float32Array
	colors?: Uint8Array
	material?: {
		size?: number
		color?: Color
		highlightColor?: Color
		highlightSize?: number
		blending?: Blending
	}
}

class Points extends Model {
	/**
	 * positions 为散点坐标数组，sizes 为散点大小数组，colors 为散点颜色数组（color的四个分量取值范围为0到255）
	 * sizes 和 colors可选，用于给每个散点单独设置大小和颜色，如果设置了 sizes 和 colors，renderer 会忽略 material.color|size
	 * material可选，material.size 设置模型中所有散点的大小默认值8，material.color 设置模型中所有散点的颜色默认值[1, 0, 0, 1]
	 * @param props
	 */
	constructor(props: IProps) {
		const geometry = new Geometry()
		const material = new PointMaterial({
			...props.material,
			hasColorAttribute: !!props.colors,
			hasSizeAttribute: !!props.sizes,
			numPoints: props.positions.length / 2
		})
		super(geometry, material)
		this.initAttributes(props)
	}

	public highlights(indexList: number[]) {
		const storage = this.material.getStorage('highlightFlags')
		const highlightFlags = new Uint32Array(storage.byteLength / 4)
		for (let index of indexList) {
			const i = (index / 32) | 0
			const j = index % 32
			const mask = 1 << j
			highlightFlags[i] |= mask
		}
		storage.udpateValue(highlightFlags)
		storage.needsUpdate = true
	}

	private initAttributes(props: IProps) {
		const positionAttribute = new Attribute('position', props.positions, 2, {
			stepMode: 'instance',
			shaderLocation: 0
		})
		this.geometry.setAttribute('position', positionAttribute)
		if (props.sizes) {
			const sizeAttribute = new Attribute('size', props.sizes, 1, { stepMode: 'instance', shaderLocation: 1 })
			this.geometry.setAttribute('size', sizeAttribute)
		}
		if (props.colors) {
			const colorAttribute = new Attribute('color', props.colors, 4, { stepMode: 'instance', shaderLocation: 2 })
			this.geometry.setAttribute('color', colorAttribute)
		}
		this.geometry.vertexCount = 6 //wgsl 中通过硬编码设置了两个三角形的顶点坐标，由此组成一个正方形代表一个可以设置尺寸的散点
	}
}

export default Points
