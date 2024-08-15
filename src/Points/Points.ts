import Geometry from '../geometry/geometry'
import Attribute from '../geometry/attribute'
import PointMaterial from './pointMaterial'
import Model from '../Model'
import { Blending, Color, IPlayable } from '../types'
import { deepMerge, packUint8ToUint32, unpackUint32ToUint8 } from '../utils'
import RadiusStorage from './radiusStorage'

const defaultStyle = {
	radius: 8,
	color: [0.9, 0.3, 0.2, 0.7] as Color,
	blending: 'normalBlending' as Blending
}

type IProps = {
	position: Float32Array
	radius?: Uint8Array
	color?: number[]
	startTime?: Float32Array
	total?: number
	style: {
		radius?: number
		color?: Color
		blending?: Blending
	}
}

class Points extends Model implements IPlayable {
	private _playable = false
	private _total: number
	/**
	 * position 为散点坐标数组长度为2 * total，radius 为散点大小数组长度为2 * total，color 为散点颜色数组长度为4 * total（color的四个分量取值范围为0到1）
	 * radius, startTime 和 color可选，用于给每个散点单独设置大小, 时间和颜色，如果设置了 radius 和 color，renderer 会忽略 style.color|radius
	 * material可选，material.radius 设置模型中所有散点的大小默认值8，material.color 设置模型中所有散点的颜色默认值[1, 0, 0, 1]
	 * @param props
	 */
	constructor(props: IProps) {
		const geometry = new Geometry()
		const style = deepMerge(defaultStyle, props.style)
		const total = props.total || props.position.length / 2
		const radiusStorage = new RadiusStorage({ data: props.radius })
		const material = new PointMaterial({
			...defaultStyle,
			...style,
			hasColorAttribute: !!props.color,
			total,
			radiusStorage,
			hasTime: !!props.startTime
		})

		super(geometry, material)

		this._style = deepMerge(defaultStyle, props.style)
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

	get total() {
		return this._total
	}

	private getRadiusStorage() {
		return this.material.getStorage('radius') as RadiusStorage
	}

	setStyle(style: IProps['style'], pointIndices?: number[]) {
		if (!pointIndices) {
			this._style = deepMerge(this._style, style)
			this.updateMaterial()
		} else {
			if (style.color) {
				let colorArray = this.getAttribute('color')
				if (!colorArray) {
					colorArray = new Uint32Array(this.total)
					for (let i = 0; i < this.total; ++i) {
						const color = packUint8ToUint32(this._style.color.map((c: number) => c * 255))
						colorArray[i] = color
					}
					const colorAttribute = new Attribute('color', colorArray, 1, {
						stepMode: 'instance',
						shaderLocation: 1,
						capacity: this.total
					})
					this.geometry.setAttribute('color', colorAttribute)
					this.material.updateShaderCode(
						true,
						this.material.hasRadiusAttribute,
						this.material.hasTimeAttribute
					)
				}
				for (let i of pointIndices) {
					const color = packUint8ToUint32(style.color.map((c) => c * 255) as Color)
					colorArray[i] = color
				}
				this.setAttribute('color', colorArray)
			}
			if (style.radius) {
				const radiusStorage = this.getRadiusStorage()
				if (!radiusStorage.hasData) {
					this.material.updateShaderCode(
						this.material.hasColorAttribute,
						true,
						this.material.hasTimeAttribute
					)
				}
				radiusStorage.updatePointsRadius(style.radius, this._style.radius, this.total, pointIndices)
			}
		}
	}

	setTotal(count: number) {
		this._total = count
		for (let attr of this.geometry.getAttributes()) {
			attr.reallocate(count * attr.itemSize)
		}
	}

	private updateMaterial() {
		for (let k in this._style) {
			this._material.updateUniform(k, this._style[k])
		}
	}

	private initAttributes(props: IProps) {
		const positionAttribute = new Attribute('position', props.position, 2, {
			stepMode: 'instance',
			shaderLocation: 0,
			capacity: this.total * 2
		})
		this.geometry.setAttribute('position', positionAttribute)

		if (props.color) {
			const colorArray = new Uint32Array(props.color.length / 4)
			for (let i = 0; i < props.color.length / 4; ++i) {
				const color = packUint8ToUint32([
					props.color[i * 4 + 0] * 255,
					props.color[i * 4 + 1] * 255,
					props.color[i * 4 + 2] * 255,
					props.color[i * 4 + 3] * 255
				])
				colorArray[i] = color
			}
			const colorAttribute = new Attribute('color', colorArray, 1, {
				stepMode: 'instance',
				shaderLocation: 1,
				capacity: this.total * 1
			})
			this.geometry.setAttribute('color', colorAttribute)
		}

		if (props.startTime) {
			const startTimeAttribute = new Attribute('startTime', props.startTime, 1, {
				stepMode: 'instance',
				shaderLocation: 2,
				capacity: this.total * 1
			})
			this.geometry.setAttribute('startTime', startTimeAttribute)
		}

		this.geometry.vertexCount = 6 //wgsl 中通过硬编码设置了两个三角形的顶点坐标，由此组成一个正方形代表一个可以设置尺寸的散点
		this.geometry.instanceCount = props.position.length / 2
	}

	private reallocate() {
		for (let attr of this.geometry.getAttributes()) {
			attr.reallocate(this.total * attr.itemSize)
		}
		this.getRadiusStorage().reallocate(this.total)
	}

	public appendPoints({ position, startTime }: Pick<IProps, 'position' | 'startTime'>) {
		const appendLen = position.length / 2
		if (startTime && startTime.length !== appendLen) {
			throw 'startTime 数据不完备'
		}

		const currentLen = this.geometry.instanceCount
		if (appendLen + currentLen > this.total) {
			this._total = currentLen + appendLen * 5
			this.reallocate()
		}
		const positionAttr = this.geometry.getAttribute('position')
		if (positionAttr?.array) {
			positionAttr.array.set(position, currentLen * 2)
			positionAttr.needsUpdate = true
		}
		const colorAttr = this.geometry.getAttribute('color')
		if (colorAttr) {
			const colorArray = new Uint32Array(appendLen)
			for (let i = 0; i < appendLen; ++i) {
				const color = packUint8ToUint32(this._style.color.map((c: number) => c * 255))
				colorArray[i] = color
			}
			colorAttr.array.set(colorArray, currentLen)
			colorAttr.needsUpdate = true
		}
		const startTimeAttr = this.geometry.getAttribute('startTime')
		if (startTime && startTimeAttr?.array) {
			startTimeAttr.array.set(startTime, currentLen)
			startTimeAttr.needsUpdate = true
		}
		const radiusStorage = this.getRadiusStorage()
		radiusStorage.appendData(this._style.radius, appendLen, currentLen)

		this.geometry.instanceCount += appendLen
	}

	public updateCurrentTime(time: number): void {
		this.material.updateUniform('currentTime', time)
	}
}

export default Points
