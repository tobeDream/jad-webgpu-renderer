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

type IProps = {
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

export class Paths implements IRenderable {
	private _id = 'paths_' + genId()
	private _style: Style
	private _pathsStyle: Record<string, Style>
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
		this._pathsStyle = {}
		for (let p of paths) {
			if (p.style) {
				this._pathsStyle[p.pathId] = p.style
			}
			const pathStyle = deepMerge(this._style, p.style || {})
			const pathModel = new Path({ ...p, style: pathStyle })
			pathModel.bufferPool = this.bufferPool //通过将一个 Paths下的所有 PathModel 的 bufferPool 设为同一个，保证了在创建 buffer 时各个Path 的不同 attribute 共用同一个 buffer
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

	public appendPaths(paths: IProps[]) {}

	public setStyle(style: Style, pathIds?: string[]) {
		if (!pathIds) {
			this._style = deepMerge(this._style, style)
		} else {
			for (let pid of pathIds) {
				let pathStyle = this._pathsStyle[pid] || {}
				this._pathsStyle[pid] = deepMerge(pathStyle, style)
			}
		}
		const pathIdsToChanged = pathIds || this.pathModelList.map((p) => p.id)
		for (let id of pathIdsToChanged) {
			const pathModel = this.pathModelList.find((p) => p.id === id)
			const _style = deepMerge(this._style, this._pathsStyle[id] || {})
			if (pathModel) {
				if ('headPointVisible' in _style) {
					const existedHeadPointIndex = this.headPointList.findIndex((p) => p.id === id)
					if (!_style.headPointVisible && existedHeadPointIndex !== -1) {
						this.headPointList[existedHeadPointIndex].geometry.dispose()
						this.headPointList[existedHeadPointIndex].material.dispose()
						this.headPointList.splice(existedHeadPointIndex, 1)
					} else if (_style.headPointVisible && existedHeadPointIndex === -1 && pathModel.startTimes) {
						this.createHeadPoint(pathModel, _style, pathModel.positions, pathModel.startTimes)
					}
				}
				if ('drawLine' in _style && _style['drawLine'] !== pathModel.drawLine) {
					pathModel.changeDrawLine(_style.drawLine, pathModel.positions)
				}
				pathModel.material.changeStyle(_style)
			}
			const headPointModel = this.headPointList.find((h) => h.id === id)
			if (headPointModel) {
				for (let k in _style) {
					if (k === 'colorBySpeed') {
						headPointModel.material.changeShaderCode(genHeadPointShaderCode(!!_style.colorBySpeed))
					} else if (k === 'speedColorList') {
						const speedColorList = new Float32Array(_style.speedColorList.flat())
						headPointModel.material.updateStorage('speedColorList', speedColorList)
					} else {
						//@ts-ignore
						headPointModel.material.updateUniform(k, _style[k])
					}
				}
			}
		}
	}

	private createHeadPoint(pathModel: Path, style: Required<Style>, position: Float32Array, startTime?: Float32Array) {
		const positionBufferView = pathModel.material.getStorage('positions')?.bufferView
		const startTimeBufferView = pathModel.material.getStorage('startTimes')?.bufferView
		let headPointColor = style.headPointColor || style.color
		const headPointSize = style.headPointSize
		const speedColorList = new Float32Array(style.speedColorList.flat())
		const geometry = new Geometry()
		geometry.vertexCount = 6
		const material = new Material({
			id: 'heatPoint',
			renderCode: genHeadPointShaderCode(!!style.colorBySpeed),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: style.blending,
			uniforms: { time: 0, size: headPointSize, pointIndex: 0, headPointColor },
			storages: {
				positions: position,
				startTimes: startTime,
				speedColorList,
			},
		})
		const positionStorage = material.getStorage('positions')
		//headPoint 和 path 共用同一个 position storage buffer。startTime 同理
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

	updateCurrentTime(time: number) {
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
