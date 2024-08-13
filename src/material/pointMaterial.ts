import Material from './material'
import { Blending, Color } from '../types'
import { getShaderCode } from './shaders/points'

export type IProps = {
	hasColorAttribute: boolean
	total: number
	blending: Blending
	color: Color
	radius: number
	radiuses?: Uint8Array
	hasTime?: boolean
}

class PointMaterial extends Material {
	constructor(props: IProps) {
		const { color, radius } = props
		let radiuses: Uint32Array | undefined = undefined
		if (props.radiuses) {
			radiuses = new Uint32Array(Math.ceil(props.radiuses.length / 4))
			for (let i = 0; i < props.radiuses.length; ++i) {
				const index = Math.floor(i / 4)
				const offset = i % 4
				radiuses[index] = radiuses[index] + (props.radiuses[i] << (offset * 8))
			}
		}
		super({
			id: 'point',
			renderCode: getShaderCode(props.hasColorAttribute, !!props.radiuses, !!props.hasTime),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: props.blending,
			storages: { radiuses },
			uniforms: { style: { color, radius, currentTime: -1 } }
		})
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PointMaterial
