import Material from './material'
import { Blending, Color } from '../types'
import { getShaderCode } from './shaders/points'

type IProps = {
	hasColorAttribute: boolean
	hasSizeAttribute: boolean
	numPoints: number
	blending?: Blending
	color?: Color
	highlightColor?: Color
	highlightSize?: number
	size?: number
}

class PointMaterial extends Material {
	constructor(props: IProps) {
		const color = props.color !== undefined ? props.color.slice() : [1, 0, 0, 0.7]
		const size = props.size !== undefined ? props.size : 10
		//highlightList 存放高亮点的 index 列表，使用 uin32数组存放，每个 uint32中记录32个相邻点的高亮情况
		//bit 值为0代表没高亮，为1代表高亮
		const highlightList = new Uint32Array(Math.max(props.numPoints / 32, 1))
		const highlightColor = props.highlightColor || [1, 0, 0, 1]
		const highlightSize = props.highlightSize || size * 1.2
		super({
			id: 'point',
			renderCode: getShaderCode(props.hasColorAttribute, props.hasSizeAttribute),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: props?.blending,
			storages: {
				highlightFlags: highlightList
			},
			uniforms: { style: { color, size, highlightColor, highlightSize } }
		})
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PointMaterial
