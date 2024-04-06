import { Vector3 } from 'three'
import { makeShaderDataDefinitions } from 'webgpu-utils'
import Uniform from '../material/uniform'

const defaultWorkgroupSize: [number, number, number] = [8, 8, 1]

export const recordComputePass = (
	device: GPUDevice,
	encoder: GPUCommandEncoder,
	shader: string,
	outputBuffers: Record<string, GPUBuffer>,
	workCount: [number, number, number],
	opts?: {
		entry?: string
		inputBuffers?: Record<string, GPUBuffer>
		uniforms?: Record<string, any>
		workgroupSize?: [number, number, number]
	}
) => {
	const entryPoint = opts?.entry || 'main'
	const defs = makeShaderDataDefinitions(shader)
	const workgroupSize = opts?.workgroupSize || defaultWorkgroupSize.slice()

	const pipeline = device.createComputePipeline({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({
				label: 'compute shader module',
				code: shader
			}),
			entryPoint
		}
	})

	const computePass = encoder.beginComputePass()
	computePass.setPipeline(pipeline)

	const bindGroupDescriptors: GPUBindGroupDescriptor[] = []
	if (opts?.uniforms) {
		for (let un in defs.uniforms) {
			const uniform = new Uniform({ name: un, def: defs.uniforms[un], value: opts.uniforms[un] })
			const buffer = uniform.getBuffer(device)
			const { group, binding } = uniform
			if (!buffer) continue
			if (!bindGroupDescriptors[group]) {
				const descriptor: GPUBindGroupDescriptor = {
					layout: pipeline.getBindGroupLayout(group),
					entries: []
				}
				bindGroupDescriptors[group] = descriptor
			}
			;(bindGroupDescriptors[group].entries as GPUBindGroupEntry[]).push({
				binding,
				resource: { buffer }
			})
		}
	}
	const storageBuffers = { ...outputBuffers, ...opts?.inputBuffers }
	for (let sn in defs.storages) {
		const { group, binding } = defs.storages[sn]
		if (sn in storageBuffers) {
			if (!bindGroupDescriptors[group]) {
				const descriptor: GPUBindGroupDescriptor = {
					layout: pipeline.getBindGroupLayout(group),
					entries: []
				}
				bindGroupDescriptors[group] = descriptor
			}
			;(bindGroupDescriptors[group].entries as GPUBindGroupEntry[]).push({
				binding,
				resource: { buffer: storageBuffers[sn] }
			})
		}
	}
	for (let i = 0; i < bindGroupDescriptors.length; ++i) {
		if (bindGroupDescriptors[i]) {
			computePass.setBindGroup(i, device.createBindGroup(bindGroupDescriptors[i]))
		}
	}
	computePass.dispatchWorkgroups(
		Math.ceil(workCount[0] / workgroupSize[0]),
		Math.ceil(workCount[1] / workgroupSize[1]),
		Math.ceil(workCount[2] / workgroupSize[2])
	)
	computePass.end()
}
