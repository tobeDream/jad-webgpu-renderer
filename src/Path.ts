import Geometry from './geometry/geometry'
import Attribute from './geometry/attribute'
import PathMaterial from './material/pathMaterial'
import Model from './Model'
import { Blending, Color, IRenderable } from './types'
import BufferPool from './buffer/bufferPool'
import Renderer from './Renderer'
import { Camera } from './camera/camera'
import BufferView from './buffer/bufferView'

type IProps = {
	positions: Float32Array
	material?: {
		color?: Color
		lineWidth?: number
		blending?: Blending
	}
	bufferPool?: BufferPool
}

export class Path extends Model {
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

		if (props.bufferPool) {
			this.bufferPool.dispose()
			this.bufferPool = props.bufferPool
		}

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

	prevRender(renderer: Renderer, encoder: GPUCommandEncoder, camera: Camera) {}

	render(renderer: Renderer, pass: GPURenderPassEncoder, camera: Camera) {
		if (!this.bufferPool.initialed) {
			const bufferViews: BufferView[] = []
			for (let path of this.pathModelList) {
				bufferViews.push(...path.material.getBufferViews())
			}
			this.bufferPool.createBuffers(renderer.device, bufferViews)
		}
		for (let path of this.pathModelList) {
			path.render(renderer, pass, camera)
		}
	}
}
