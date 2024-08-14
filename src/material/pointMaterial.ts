import Material from './material'
import { Blending, Color } from '../types'
import { getShaderCode } from './shaders/points'
import { packUint8ToUint32 } from '@/utils'

export type IProps = {
	hasColorAttribute: boolean
	total: number
	blending: Blending
	color: Color
	radius: number
	radiuses?: Uint8Array
	hasTime?: boolean
}

export const transformRadiusArray = (data: Uint8Array | { value: number; total: number }) => {
	const radiuses = new Uint32Array(Math.ceil('total' in data ? data.total / 4 : data.length / 4))
	const len = 'total' in data ? data.total : data.length
	for (let i = 0; i < radiuses.length; ++i) {
		if ('value' in data) {
			const v = data.value
			radiuses[i] = packUint8ToUint32([v, v, v, v])
		} else {
			radiuses[i] = packUint8ToUint32([
				data[i * 4 + 0] || 0,
				data[i * 4 + 0] || 0,
				data[i * 4 + 0] || 0,
				data[i * 4 + 0] || 0
			])
		}
	}
	return radiuses
}

class PointMaterial extends Material {
	public hasColorAttribute = false
	public hasRadiusAttribute = false
	public hasTimeAttribute = false
	constructor(props: IProps) {
		const { color, radius } = props
		let radiuses: Uint32Array | undefined = undefined
		if (props.radiuses) {
			radiuses = transformRadiusArray(props.radiuses)
		}
		super({
			id: 'point',
			renderCode: getShaderCode(props.hasColorAttribute, !!props.radiuses, !!props.hasTime),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: props.blending,
			storages: { radius: radiuses },
			uniforms: { style: { color, radius, currentTime: -1 } }
		})

		this.hasColorAttribute = props.hasColorAttribute
		this.hasRadiusAttribute = !!props.radiuses
		this.hasTimeAttribute = !!props.hasTime
	}

	public updateShaderCode(hasColor: boolean, hasRadius: boolean, hasTime: boolean) {
		this.changeShaderCode(getShaderCode(hasColor, hasRadius, hasTime))
		this.hasColorAttribute = hasColor
		this.hasRadiusAttribute = hasRadius
		this.hasTimeAttribute = hasTime
	}

	public updateUniform(uniformName: string, value: any) {
		const styleUniform = this.getUniform('style')
		if (!styleUniform) return
		if (!(uniformName in styleUniform.value)) return
		styleUniform.updateValue({ ...styleUniform.value, [uniformName]: value })
	}
}

export default PointMaterial
