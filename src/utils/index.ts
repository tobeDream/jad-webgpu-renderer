import { makeBindGroupLayoutDescriptors, makeShaderDataDefinitions } from 'webgpu-utils'

export const generateBindGroupsFromShaderCode = (code: string) => {
	const defs = makeShaderDataDefinitions(code)
}

export const precreatedUniforms = ['projectionMatrix', 'viewMatrix', 'resolution']
