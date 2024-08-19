import Model from '../Model'
import { Path, Style } from './Path'
import BufferPool from '@/buffer/bufferPool'
import Geometry from '../geometry/geometry'
import Material from '../material/material'
import { genHeadPointShaderCode } from '@/material/shaders/path'

export class HeadPoint extends Model {
	constructor(pathModel: Path, style: Required<Style>, bufferPool: BufferPool) {
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
			storages: { speedColorList },
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

		super(geometry, material)
		this.id = pathModel.id
		this.bufferPool = bufferPool
	}

	dispose() {
		this._geometry.dispose()
		const uniforms = this.material.getUniforms()
		for (let un in uniforms) {
			uniforms[un].dispose()
		}
	}
}
