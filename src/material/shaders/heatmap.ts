//因为保存热力值的纹理 format 为 rgba16float, 计算出来的像素热力值可能超过 f16的取值上限，所以在将热力值写入纹理前先将热力值除以 heatValuePrec
export const heatValuePrec = 100

export const computeHeatValueShaderCode = `
    struct Vertex {
        @builtin(vertex_index) vi: u32,
        @location(0) position: vec2f,
    };

    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) pointCoord: vec2f,
    };

    @group(0) @binding(0) var<uniform> resolution: vec2f;
    @group(0) @binding(1) var<uniform> size: f32;

    @vertex fn vs(vert: Vertex) ->  VSOutput{
        let points = array(
            vec2f(-1, -1),
            vec2f( 1, -1),
            vec2f(-1,  1),
            vec2f(-1,  1),
            vec2f( 1, -1),
            vec2f( 1,  1),
        );

        let pos = points[vert.vi];
        let pointPos = pos * size / resolution;

        var vsOut: VSOutput;
        vsOut.position = vec4f(vert.position + pointPos, 0, 1);
        vsOut.pointCoord = pos;

        return vsOut;
    }

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let coord = vsOut.pointCoord;
        let dis = length(coord);
        if(dis >= 1) {
            discard;
        }
        let h = pow(1.0 - dis, 1.5) / ${heatValuePrec};
        return vec4f(h, 0, 0, 0);
    }
`

export const computeMaxHeatValueShaderCode = `
    @group(0) @binding(0) var heatValTex: texture_2d<f32>;
    @group(0) @binding(1) var<uniform> resolution: vec2f;

    struct VSOut {
        @location(0) vi: f32,
        @builtin(position) position: vec4f
    }

    @vertex fn vs(@builtin(vertex_index) vii: u32) -> VSOut {
        var vsOut: VSOut;
        vsOut.vi = f32(vii);
        vsOut.position = vec4f(0, 0, 0, 1);
        return vsOut;
    }

    @fragment fn fs(vsOut: VSOut) -> @location(0) vec4f {
        let vi = i32(vsOut.vi);
        let y = vi / i32(resolution.x);
        let x = vi - i32(resolution.x) * y;
        let color = textureLoad(heatValTex, vec2i(x, y), 0);
        return color;
    }
`

export const renderShaderCode = `
    @group(0) @binding(0) var heatValTex: texture_2d<f32>;
    @group(0) @binding(1) var maxValTex: texture_2d<f32>;
    @group(0) @binding(2) var<uniform> maxHeatValueRatio: f32;
    @group(0) @binding(3) var<uniform> colors: array<vec4f, 5>;

    fn fade(low: f32, mid: f32, high: f32, value: f32, ) -> f32 {
        let rl = abs(mid - low);
        let rr = abs(mid - high);
        var vl = (mid - value) / rl;
        vl = step(0, vl) * vl;
        var vr = (value - mid) / rr;
        vr = step(0, vr) * vr;

        return 1 - clamp(vl + vr, 0, 1);
    }

    fn interpColor(heatValue: f32) -> vec4f {
        if(heatValue > 1){
            return vec4f(colors[0].rgb, 1);
        }
        if(heatValue < 0){
            return vec4f(colors[4].rgb, 1);
        }
        var color = vec3f(0, 0, 0);
        for(var i = 0;  i < 5; i++){
            color += fade(
                select(colors[i + 1].a, colors[4].a - colors[3].a, i == 4),
                colors[i].a,
                select(colors[i - 1].a, colors[0].a + colors[1].a, i == 0),
                heatValue
            ) * colors[i].rgb;
        }
        return vec4f(color, 1);
    }

    @vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
        let pos = array(
            vec2f(-1.0, 1.0),
            vec2f(-1.0, -1.0),
            vec2f(1.0, -1.0),
            vec2f(1.0, -1.0),
            vec2f(1.0, 1.0),
            vec2f(-1.0, 1.0)
        );

        let p = vec4f(pos[vi % 6], 0, 1);
        return p;
    }

    @fragment fn fs(@builtin(position) coord: vec4f) ->  @location(0) vec4f {
        var heatValue = textureLoad(heatValTex, vec2i(floor(coord.xy)), 0).r;
        if(heatValue == 0){
            discard;
        }
        let maxHeatValue = textureLoad(maxValTex, vec2i(0, 0), 0).r * maxHeatValueRatio;
        heatValue = clamp(heatValue / maxHeatValue, 0, 1);
        let color = interpColor(heatValue) * heatValue;

        return color;
    }
`
