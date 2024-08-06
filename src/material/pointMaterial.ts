import Material from './material'
import { Blending, Color } from '../types'
import { getShaderCode } from './shaders/points'

export type IProps = {
	hasColorAttribute: boolean
	total: number
	blending: Blending
	color: Color
	radius: number
	highlightColor: Color
	highlightRadius: number
	hoverColor: Color
	hoverRadius: number
	radiuses?: Uint8Array
	hasTime?: boolean
}

class PointMaterial extends Material {
	constructor(props: IProps) {
		const { color, radius, highlightColor, highlightRadius, hoverColor, hoverRadius } = props
		//highlightList 存放高亮点的 index 列表，使用 uin32数组存放，每个 uint32中记录32个相邻点的高亮情况
		//bit 值为0代表没高亮，为1代表高亮
		const highlightList = new Uint32Array(Math.max(props.total / 32, 1))
		const hoverList = new Uint32Array(Math.max(props.total / 32, 1))
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
			storages: {
				highlightFlags: highlightList,
				hoverFlags: hoverList,
				radiuses
			},
			uniforms: {
				style: { color, radius, highlightColor, highlightRadius, hoverColor, hoverRadius, currentTime: -1 }
			}
		})
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PointMaterial
