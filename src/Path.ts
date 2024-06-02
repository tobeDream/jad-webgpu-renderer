import Geometry from './geometry/geometry'
import PathMaterial from './material/pathMaterial'
import Model from './Model'
import { Blending, Color, IRenderable } from './types'
import BufferPool from './buffer/bufferPool'
import Renderer from './Renderer'
import { Camera } from './camera/camera'
import BufferView from './buffer/bufferView'

type IProps = {
	positions: Float32Array
	timestamps?: Float32Array
	material?: {
		color?: Color
		unplayedColor?: Color
		lineWidth?: number
		blending?: Blending
		tailDuration?: number
	}
	bufferPool?: BufferPool
}

export class Path extends Model {
	/**
	 * positions 为轨迹点的坐标数组经纬度间隔存放
	 * timestamps 为轨迹上各个轨迹点的相对发生时间的毫秒级时间戳，如果设置后，轨迹默认不显示，用户通过updateTime接口更新当前时间，轨迹点时间小于当前时间的部分轨迹才会显示出来
	 * trailDuration 播放的部分轨迹在持续trailDuration时间后消失，单位为毫秒
	 * @param props
	 * @returns
	 */
	constructor(props: IProps) {
		const res = Path.extendLineToMesh(props.positions)
		if (!res) return
		const { indexArr } = res

		const geometry = new Geometry()
		const material = new PathMaterial({
			...props.material,
			positions: props.positions,
			timestamps: props.timestamps
		})

		super(geometry, material)

		if (props.bufferPool) {
			this.bufferPool.dispose()
			this.bufferPool = props.bufferPool
		}

		this.geometry.setIndex(indexArr)
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
	protected _visible: boolean
	protected _renderOrder: number
	protected bufferPool = new BufferPool()
	protected pathModelList: Path[]

	constructor(paths: IProps[]) {
		this.bufferPool = new BufferPool()
		this.pathModelList = []
		this._visible = true
		this._renderOrder = 0
		for (let p of paths) {
			this.pathModelList.push(new Path({ ...p, bufferPool: this.bufferPool }))
		}
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
	}

	prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera) {}

	render(renderer: Renderer, pass: GPURenderPassEncoder, camera: Camera) {
		if (!this.bufferPool.initialed) {
			const bufferViews: BufferView[] = []
			for (let path of this.pathModelList) {
				bufferViews.push(...path.material.getBufferViews(), ...path.geometry.getBufferViews())
			}
			this.bufferPool.createBuffers(renderer.device, bufferViews)
		}
		for (let path of this.pathModelList) {
			path.render(renderer, pass, camera)
		}
	}
}
