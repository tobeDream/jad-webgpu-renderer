import Material from './material'
import { Blending } from 'localType'

const code = `
    struct Vertex {
        @location(0) position: vec2f,
        @location(1) size: f32,
        @location(2) color: vec4f
    };

    @group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
    @group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;
    @group(0) @binding(2) var<uniform> resolution: vec2f;

    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) pointCoord: vec2f
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
        let clipPos = projectionMatrix * viewMatrix * vec4f(vert.position, 0, 1);
        let pointPos = vec4f(pos * vert.size / resolution * clipPos.w, 0, 0);

        var vsOut: VSOutput;
        vsOut.position = clipPos + pointPos;
        vsOut.color = vert.color;
        vsOut.pointCoord = pos;
        return vsOut;
    }

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let coord = vsOut.pointCoord;
        if(length(coord) > 1) {
            discard;
        }
        let alpha = vsOut.color.a;
        return vec4f(vsOut.color.rgb * alpha, alpha);
    }
`

type IProps = { blending?: Blending }

class PointMaterial extends Material {
	constructor(props?: IProps) {
		console.log(props?.blending)
		super({ shaderCode: code, vertexShaderEntry: 'vs', fragmentShaderEntry: 'fs', blending: props?.blending })
	}
}

export default PointMaterial
