import Geometry from './geometry/geometry'
import PathMaterial from './material/pathMaterial'
import Model from './Model'
import { Blending, Color, IPlayable, IRenderable } from './types'
import BufferPool from './buffer/bufferPool'
import Renderer from './Renderer'
import { Camera } from './camera/camera'
import BufferView from './buffer/bufferView'
import Material from './material/material'
import { genHeadPointShaderCode } from './material/shaders/path'
import { binarySearch, convertUniformColor, deepMerge, genId } from './utils'

const defaultStyle = {
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

type Style = {
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

type IProps = {
	pathId: string
	position: Float32Array
	startTime?: Float32Array
	style?: Style
}

export class Path extends Model {
	private _startTimes?: Float32Array
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

		if (!drawLine) {
			const pathIndexRes = Path.extendLineToMesh(props.position)
			if (!pathIndexRes) return
			const { indexArr } = pathIndexRes
			this.geometry.setIndex(indexArr)
		} else {
			this.geometry.vertexCount = props.position.length / 2
		}

		this._startTimes = props.startTime
	}

	get startTimes() {
		return this._startTimes
	}

	get material() {
		return this._material as PathMaterial
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

export class Paths implements IRenderable {
	private _id = 'paths_' + genId()
	private _style: Style
	protected _visible = true
	protected _renderOrder = 0
	protected bufferPool = new BufferPool()
	protected pathModelList: Path[] = []
	protected headPointList: Model[] = []

	/**
	 * 参数为 Path  参数数组，每个Path 参数中包括：
	 * position 为轨迹点的坐标数组经纬度间隔存放
	 * startTime 为轨迹上各个轨迹点的相对发生时间的毫秒级时间戳，如果设置后，轨迹默认不显示，用户通过updateTime接口更新当前时间，轨迹点时间小于当前时间的部分轨迹才会显示出来
	 * style.lineWidth 为轨迹像素宽度，默认值为5，drawLine为 false 时生效
	 * style.color为轨迹播放后部分的颜色，默认值为[1, 0, 0, 0.7]
	 * style.drawLine 默认为 false，为 true 时轨迹宽度恒等于1，webgpu 将使用 line-strip 渲染轨迹，为 false 时使用 triangle-list 渲染轨迹
	 * style.trailDuration 播放的部分轨迹在持续trailDuration时间后消失，单位为毫秒，仅当 startTime 参数存在时有效，传0值时取消拖尾效果
	 * style.unplayedColor 为轨迹尚未播放 部分的颜色，默认值为[0, 0, 0, 0.05]
	 * style.unplayedLineWidth 为轨迹尚未播放部分的宽度，默认值为5，drawLine为 false 时生效
	 * style.headPointColor 为轨迹头部圆点颜色，默认值为所属轨迹的颜色，headPointVisible 为 true 时生效
	 * style.headPointSize 为轨迹头部圆点像素大小，headPointVisible 为 t
	 * style.headPointVisible 控制轨迹头是否课件
	 * style.speedColorList 为根据轨迹头部圆点当前速度进行插值的颜色列表，长度为3，组成为[r, g, b, speed]，默认为
	 *[
        [0, 1, 0, 60],
        [0, 0, 1, 30],
        [1, 0, 0, 0],
	  ]。当 startTime 参数存在且 headPointVisible 为 true 时生效
	 * style.colorBySpeed 为true 时将由轨迹瞬时速率在 speedColorList 中 插值获得轨迹头部点的颜色
	 * @param props
	 * @returns
	 */
	constructor(paths: IProps[], style?: Style) {
		this._style = deepMerge(defaultStyle, style || {})
		for (let p of paths) {
			const pathStyle = deepMerge(this._style, p.style || {})
			const pathModel = new Path({ ...p, style: pathStyle })
			pathModel.bufferPool = this.bufferPool
			this.pathModelList.push(pathModel)
			//用 line 绘制动态轨迹时，需添加轨迹头部点，以标识轨迹当前运行的位置
			if (!!p.startTime && p.style?.headPointVisible) {
				this.createHeadPoint(pathModel, pathStyle, p.position, p.startTime)
			}
		}
	}

	get id() {
		return this._id
	}

	private createHeadPoint(pathModel: Path, style: Required<Style>, position: Float32Array, startTime?: Float32Array) {
		const positionBufferView = pathModel.material.getStorage('positions')?.bufferView
		const startTimeBufferView = pathModel.material.getStorage('startTimes')?.bufferView
		let headPointColor = style.headPointColor || style.color
		const headPointSize = style.headPointSize
		let speedColorList = new Float32Array(style.speedColorList.flat())
		const geometry = new Geometry()
		geometry.vertexCount = 6
		const material = new Material({
			id: 'heatPoint',
			renderCode: genHeadPointShaderCode(!!style.colorBySpeed),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: style.blending,
			uniforms: { time: 0, size: headPointSize, pointIndex: 0, pointColor: headPointColor },
			storages: {
				positions: position,
				startTimes: startTime,
				speedColorList,
			},
		})
		const positionStorage = material.getStorage('positions')
		if (positionStorage && positionBufferView) {
			positionStorage.bufferView = positionBufferView
		}
		const startTimeStorage = material.getStorage('startTimes')
		if (startTimeStorage && startTimeBufferView) {
			startTimeStorage.bufferView = startTimeBufferView
		}

		const pointModel = new Model(geometry, material)
		pointModel.id = pathModel.id
		pointModel.bufferPool = this.bufferPool
		this.headPointList.push(pointModel)
	}

	get visible() {
		return this._visible
	}

	set visible(v: boolean) {
		this._visible = v
	}

	get renderOrder() {
		return this._renderOrder
	}

	set renderOrder(r: number) {
		this._renderOrder = r
	}

	updateTime(time: number) {
		for (let p of this.pathModelList) {
			p.material.updateTime(time)
		}
		for (let h of this.headPointList) {
			h.material.getUniform('time')?.updateValue(time)
			const startTimes = this.pathModelList.find((p) => p.id === h.id)?.startTimes
			if (startTimes) {
				const headIndex = binarySearch(startTimes, time)
				h.material.getUniform('pointIndex')?.updateValue(headIndex)
			}
		}
	}

	prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera) {}

	render(renderer: Renderer, pass: GPURenderPassEncoder, camera: Camera) {
		if (!this.bufferPool.initialed) {
			const bufferViews: BufferView[] = []
			for (let path of this.pathModelList) {
				bufferViews.push(...path.material.getBufferViews(), ...path.geometry.getBufferViews())
			}
			for (let h of this.headPointList) {
				const hBufferViews = h.material.getBufferViews().filter((hbv) => !bufferViews.find((bv) => bv === hbv))
				bufferViews.push(...hBufferViews)
			}
			this.bufferPool.createBuffers(renderer.device, bufferViews)
		}
		for (let path of this.pathModelList) {
			path.render(renderer, pass, camera)
		}
		for (let h of this.headPointList) {
			h.render(renderer, pass, camera)
		}
	}

	dispose() {
		for (let path of this.pathModelList) {
			path.dispose()
		}
		for (let h of this.headPointList) {
			h.dispose()
		}
	}
}
