import Geometry from './geometry/geometry'
import PathMaterial from './material/pathMaterial'
import Model from './Model'
import { Blending, Color, IRenderable } from './types'
import BufferPool from './buffer/bufferPool'
import Renderer from './Renderer'
import { Camera } from './camera/camera'
import BufferView from './buffer/bufferView'
import Material from './material/material'
import { genHeadPointShaderCode } from './material/shaders/path'
import { binarySearch } from './utils'

type IProps = {
	positions: Float32Array
	timestamps?: Float32Array
	material?: {
		color?: Color
		unplayedColor?: Color
		lineWidth?: number
		blending?: Blending
		tailDuration?: number
		headPointColor?: Color
		headPointSize?: number
		speedColorList?: Color[]
	}
	drawHeadPoint?: boolean
	drawLine?: boolean
	colorBySpeed?: boolean
}

export class Path extends Model {
	private _timestamps?: Float32Array
	/**
	 * positions 为轨迹点的坐标数组经纬度间隔存放
	 * timestamps 为轨迹上各个轨迹点的相对发生时间的毫秒级时间戳，如果设置后，轨迹默认不显示，用户通过updateTime接口更新当前时间，轨迹点时间小于当前时间的部分轨迹才会显示出来
	 * material.lineWidth 为轨迹像素宽度
	 * material.trailDuration 播放的部分轨迹在持续trailDuration时间后消失，单位为毫秒
	 * material.color为轨迹播放后部分的颜色
	 * material.unplatedColor 为轨迹尚未播放播放的颜色
	 * material.headPointColor 为轨迹头部圆点颜色
	 * material.headPointSize 为轨迹头部圆点像素大小
	 * material.speedColorList 为根据轨迹头部圆点当前速度进行插值的颜色列表，长度为3，组成为[r, g, b, speed]，默认为
	 *[
        [0, 1, 0, 60],
        [0, 0, 1, 30],
        [1, 0, 0, 0],
	  ]
	 * drawLine 为 true 时使用 line-strip 绘制轨迹，
	 * drawHeadPoint 为 true 并且 timestamps 传入时在轨迹头位置绘制头部圆点
	 * colorBySpeed 为是否由轨迹瞬时速率决定轨迹头部点的颜色
	 * @param props
	 * @returns
	 */
	constructor(props: IProps) {
		const drawLine = !!props.drawLine

		const geometry = new Geometry()
		const material = new PathMaterial({
			...props.material,
			positions: props.positions,
			timestamps: props.timestamps,
			drawLine: props.drawLine
		})

		super(geometry, material)

		if (!drawLine) {
			const pathIndexRes = Path.extendLineToMesh(props.positions)
			if (!pathIndexRes) return
			const { indexArr } = pathIndexRes
			this.geometry.setIndex(indexArr)
		} else {
			this.geometry.vertexCount = props.positions.length / 2
		}

		this._timestamps = props.timestamps
	}

	get timestamps() {
		return this._timestamps
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
	protected _visible = true
	protected _renderOrder = 0
	protected bufferPool = new BufferPool()
	protected pathModelList: Path[] = []
	protected headPointList: Model[] = []

	constructor(paths: IProps[]) {
		for (let p of paths) {
			const pathModel = new Path({ ...p })
			pathModel.bufferPool = this.bufferPool
			this.pathModelList.push(pathModel)
			//用 line 绘制动态轨迹时，需添加轨迹头部点，以标识轨迹当前运行的位置
			if (!!p.timestamps && p.drawHeadPoint) {
				this.createHeatPoint(pathModel, p)
			}
		}
	}

	private createHeatPoint(pathModel: Path, params: IProps) {
		const positionBufferView = pathModel.material.getStorage('positions').bufferView
		const timestampesBufferView = pathModel.material.getStorage('timestamps').bufferView
		const headPointColor = params.material?.headPointColor || pathModel.material.getUniform('style').value.color
		const headPointSize = params.material?.headPointSize || 15
		let speedColorList = new Float32Array(
			params.material?.speedColorList?.flat() || [0, 1, 0, 60, 0.5, 0.5, 1, 30, 1, 0, 0, 0]
		)
		const geometry = new Geometry()
		geometry.vertexCount = 6
		const material = new Material({
			id: 'heatPoint',
			renderCode: genHeadPointShaderCode(!!params.colorBySpeed),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: params.material?.blending,
			uniforms: { time: 0, size: headPointSize, pointIndex: 0, pointColor: headPointColor },
			storages: {
				positions: params.positions,
				timestamps: params.timestamps,
				speedColorList
			}
		})
		material.getStorage('positions').bufferView = positionBufferView
		material.getStorage('timestamps').bufferView = timestampesBufferView
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
			h.material.getUniform('time').updateValue(time)
			const timestamps = this.pathModelList.find((p) => p.id === h.id)?.timestamps
			if (timestamps) {
				const headIndex = binarySearch(timestamps, time)
				h.material.getUniform('pointIndex').updateValue(headIndex)
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
}
