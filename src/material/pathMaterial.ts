import Material from './material'
import { Blending, TypedArray, Color } from '../types'
import { genShaderCode } from './shaders/path'

type IProps = {
	positions: TypedArray
	color?: Color
	lineWidth?: number
	blending?: Blending
	drawLine?: boolean
} & (
	| {
			timestamps: Float32Array
			tailDuration?: number
			unplayedColor?: Color
	  }
	| {}
)

class PathMaterial extends Material {
	constructor(props: IProps) {
		const hasTime = 'timestamps' in props && !!props.timestamps
		const timestamps = hasTime ? props.timestamps : undefined
		const color = props.color || [1, 0, 0, 1]
		const lineWidth = props.lineWidth || 5
		const unplayedColor = hasTime ? props.unplayedColor || [0, 0, 0, 0.05] : undefined
		const tailDuration = hasTime ? props.tailDuration : undefined
		const drawLine = !!props.drawLine
		super({
			id: 'path',
			vertexShaderEntry: drawLine ? 'lineVs' : 'vs',
			renderCode: genShaderCode(hasTime, hasTime && !!props.tailDuration),
			blending: props.blending,
			storages: { positions: props.positions, timestamps },
			uniforms: { style: { color, lineWidth, unplayedColor }, time: 0, tailDuration },
			primitive: drawLine ? { topology: 'line-strip' } : { topology: 'triangle-list' }
		})
	}

	public updateTime(time: number) {
		const timeUniform = this.getUniform('time')
		if (timeUniform) timeUniform.updateValue(time)
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PathMaterial
