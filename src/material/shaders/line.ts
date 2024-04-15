export const code = `
    const PI = radians(180.0);
    struct Vertex {
        @location(0) side: f32,
        @builtin(vertex_index) vi: u32,
    };

    struct Style {
        color:  vec4f,
        lineWidth: f32
    };

    @group(0) @binding(0) var<uniform> projectionMatrix: mat4x4f;
    @group(0) @binding(1) var<uniform> viewMatrix: mat4x4f;
    @group(0) @binding(2) var<uniform> resolution: vec2f;
    @group(1) @binding(0) var<uniform> style: Style;
    @group(1) @binding(1) var<storage, read> positions: array<vec2f>;
    @group(1) @binding(2) var<storage, read> angles: array<f32>;

    struct VSOutput {
        @builtin(position) position: vec4f
    };

    @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        let posLen = arrayLength(&positions);
        let angleLen = arrayLength(&angles);
        let index = vert.vi % posLen;
        let pos = positions[index % posLen];
        let angle = angles[index % angleLen];
        let pp = positions[(index - 1) % posLen];
        let pp2pAngle = (atan2(pp.y - pos.y, pp.x - pos.x) + 2 * PI) % (2 * PI);
        let lineWidth = select(style.lineWidth / abs(sin(pp2pAngle - angle)), style.lineWidth, index == 0);
        let clipPos = projectionMatrix * viewMatrix * vec4f(pos, 0, 1);
        let s = sin(angle);
        let c = cos(angle);
        let v = vert.side * vec2f(c, s) * lineWidth / resolution * clipPos.w;
        vsOut.position = vec4f(clipPos.xy + v, clipPos.z, clipPos.w);
        return vsOut;
    }

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let color = style.color;
        return vec4f(color.rgb * color.a, color.a);
    }
`
