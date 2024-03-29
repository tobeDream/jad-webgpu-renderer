import Material from './material'
import { Blending } from 'localType'

//wgsl 代码编译时会将未使用的 uniform 变量定义代码删掉，导致 pipeline.layout 为auto 时，不会创建这些 uniform 的 bindGroupLayout
//而我们使用的 webgpu-utils 库会将这些 uniforms 变量解析出来，导致我们在依靠 webgpu-utils 解析出来的 uniform 定义创建 bindGroup时，
//上述 uniform 的 bindGroup 会找不到 bindGroupLayout，从而报错
//所以我们需要人为地将 wgsl 代码中未使用的 uniform 定义删除
const getShaderCode = (hasColor: boolean, hasSize: boolean) => `
    struct Vertex {
        @location(0) position: vec2f,
        ${hasSize ? '@location(1) size: f32,' : ''}
        ${hasColor ? '@location(2) color: vec4f,' : ''}
    };

    @group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
    @group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;
    @group(0) @binding(2) var<uniform> resolution: vec2f;
    ${hasColor ? '' : '@group(1) @binding(0) var<uniform> color: vec4f;'}
    ${hasSize ? '' : '@group(1) @binding(1) var<uniform> size: f32;'}
    

    struct VSOutput {
        @builtin(position) position: vec4f,
        ${hasColor ? '@location(0) color: vec4f,' : ''}
        @location(1) pointCoord: vec2f,
    };

    @vertex fn vs(vert: Vertex, @builtin(vertex_index) vi: u32) -> VSOutput {
        let points = array(
            vec2f(-1, -1),
            vec2f( 1, -1),
            vec2f(-1,  1),
            vec2f(-1,  1),
            vec2f( 1, -1),
            vec2f( 1,  1),
        );
        let pos = points[vi];
        let s = ${hasSize ? 'vert.size' : 'size'};
        let clipPos = projectionMatrix * viewMatrix * vec4f(vert.position, 0, 1);
        let pointPos = vec4f(pos * s / resolution * clipPos.w, 0, 0);

        var vsOut: VSOutput;
        vsOut.position = clipPos + pointPos;
        ${hasColor ? 'vsOut.color = vert.color;' : ''}
        vsOut.pointCoord = pos;
        return vsOut;
    }

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let coord = vsOut.pointCoord;
        let dis = length(coord);
        if(dis >= 1) {
            discard;
        }
        let edgeAlpha = smoothstep(0, 0.1, 1 - dis);

        let c = ${hasColor ? 'vsOut.color' : 'color'};
        let alpha = c.a * edgeAlpha;
        return vec4f(c.rgb * alpha, alpha);
    }
`

type IProps = {
	hasColorAttribute: boolean
	hasSizeAttribute: boolean
	blending?: Blending
	color?: [number, number, number, number]
	size?: number
}

class PointMaterial extends Material {
	constructor(props: IProps) {
		const color = props.color !== undefined ? props.color.slice() : [1, 0, 0, 0.7]
		const size = props.size !== undefined ? props.size : 10
		super({
			shaderCode: getShaderCode(props.hasColorAttribute, props.hasSizeAttribute),
			vertexShaderEntry: 'vs',
			fragmentShaderEntry: 'fs',
			blending: props?.blending,
			uniforms: { color, size }
		})
	}
}

export default PointMaterial
