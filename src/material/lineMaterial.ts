import Material from './material'
import { Blending, TypedArray, Color } from '../types'
import { code } from './shaders/line'

type IProps = {
	positions: TypedArray
	color?: Color
	lineWidth?: number
	blending?: Blending
}

class LineMaterial extends Material {
	constructor(props: IProps) {
		const color = props.color || [1, 0, 0, 1]
		const lineWidth = props.lineWidth || 5
		super({
			renderCode: code,
			blending: props.blending,
			storages: { positions: props.positions },
			uniforms: { style: { color, lineWidth } }
		})
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.renderPipeline.getUniform('style')
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default LineMaterial
