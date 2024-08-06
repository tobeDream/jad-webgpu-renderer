import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PointMaterial, { IProps as IMatProps } from './material/pointMaterial'
import Model from './Model'
import { Blending, Color, IPlayable, IStylable, PlayStatus } from './types'

const defaultStyle = {
	radius: 8,
	color: [0.9, 0.3, 0.2, 0.7] as Color,
	blending: 'normalBlending' as Blending,
	highlightRadius: 12,
	highlightColor: [1, 0, 0, 1] as Color,
	hoverRadius: 8,
	hoverColor: [1, 0, 0, 1] as Color
}

type IProps = {
	positions: Float32Array
	radius?: Uint8Array
	colors?: Uint8Array
	startTime?: Float32Array
	total?: number
	style: {
		radius?: number
		color?: Color
		blending?: Blending
		highlightColor?: Color
		highlightRadius?: number
		hoverColor?: Color
		hoverRadius?: number
	}
}

class Points extends Model implements IStylable, IPlayable {
	private _playable = false
	private _total: number
	/**
	 * positions 为散点坐标数组，sizes 为散点大小数组，colors 为散点颜色数组（color的四个分量取值范围为0到255）
	 * sizes 和 colors可选，用于给每个散点单独设置大小和颜色，如果设置了 sizes 和 colors，renderer 会忽略 material.color|size
	 * material可选，material.size 设置模型中所有散点的大小默认值8，material.color 设置模型中所有散点的颜色默认值[255, 0, 0, 1]
	 * @param props
	 */
	constructor(props: IProps) {
		const geometry = new Geometry()
		const style = props.style
		const color = style?.color || defaultStyle.color
		const highlightColor = style?.highlightColor || defaultStyle.highlightColor
		const hoverColor = style?.hoverColor || defaultStyle.hoverColor
		const highlightRadius = style.highlightRadius || defaultStyle.highlightRadius
		const hoverRadius = style.hoverRadius || defaultStyle.hoverRadius
		const total = props.total || props.positions.length / 2
		const material = new PointMaterial({
			...defaultStyle,
			...style,
			color,
			highlightColor,
			highlightRadius,
			hoverColor,
			hoverRadius,
			hasColorAttribute: !!props.colors,
			total,
			radiuses: props.radius,
			hasTime: !!props.startTime
		})

		super(geometry, material)

		this._total = total
		this.initAttributes(props)
		this._playable = !!props.startTime
	}

	get playable() {
		return this._playable
	}

	get material() {
		return this._material as PointMaterial
	}

	public highlights(indexList: number[]) {
		const storage = this.material.getStorage('highlightFlags')
		const highlightFlags = new Uint32Array(storage.size / 4)
		for (let index of indexList) {
			const i = (index / 32) | 0
			const j = index % 32
			const mask = 1 << j
			highlightFlags[i] |= mask
		}
		storage.updateValue(highlightFlags)
		storage.needsUpdate = true
	}

	public hover(indexList: number[]) {
		const storage = this.material.getStorage('hoverFlags')
		const hoverFlags = new Uint32Array(storage.size / 4)
		for (let index of indexList) {
			const i = (index / 32) | 0
			const j = index % 32
			const mask = 1 << j
			hoverFlags[i] |= mask
		}
		storage.updateValue(hoverFlags)
		storage.needsUpdate = true
	}

	private initAttributes(props: IProps) {
		const positionAttribute = new Attribute('position', props.positions, 2, {
			stepMode: 'instance',
			shaderLocation: 0
		})
		this.geometry.setAttribute('position', positionAttribute)

		if (props.colors) {
			const colorAttribute = new Attribute('color', props.colors, 4, { stepMode: 'instance', shaderLocation: 1 })
			this.geometry.setAttribute('color', colorAttribute)
		}

		if (props.startTime) {
			const startTimeAttribute = new Attribute('startTime', props.startTime, 1, {
				stepMode: 'instance',
				shaderLocation: 2
			})
			this.geometry.setAttribute('startTime', startTimeAttribute)
		}

		this.geometry.vertexCount = 6 //wgsl 中通过硬编码设置了两个三角形的顶点坐标，由此组成一个正方形代表一个可以设置尺寸的散点
	}

	public updateCurrentTime(time: number): void {
		this.material.updateUniform('currentTime', time)
	}

	// public setStyle(style: IProps['style'], indexList?: (string | number)[] | undefined) {}
}

export default Points
