import Material from './material'
import { Blending, Color } from '../types'
import { genShaderCode } from './shaders/path'

type IProps = {
	position: Float32Array
	startTime?: Float32Array
	color?: Color
	lineWidth?: number
	blending?: Blending
	drawLine?: boolean
	tailDuration?: number
	unplayedColor?: Color
}

class PathMaterial extends Material {
	constructor(props: IProps) {
		const hasTime = !!props.startTime
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
			storages: { positions: props.position, startTimes: props.startTime },
			uniforms: { style: { color, lineWidth, unplayedColor }, time: 0, tailDuration },
			primitive: drawLine ? { topology: 'line-strip' } : { topology: 'triangle-list' },
		})
	}

	public updateTime(time: number) {
		const timeUniform = this.getUniform('time')
		if (timeUniform) timeUniform.updateValue(time)
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!styleUniform || !(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PathMaterial
