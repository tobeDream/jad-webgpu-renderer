export const heatValuePrec = 10000

export const computeShaderCode = `
    const prec = ${heatValuePrec}f;
    @group(0) @binding(0) var<storage> points: array<vec2f>;
    @group(0) @binding(1) var<storage, read_write> heatValueArr: array<atomic<u32>>;
    @group(0) @binding(2) var<uniform> grid: vec2u;
    @group(0) @binding(3) var<uniform> resolution: vec2f;
    @group(0) @binding(4) var<uniform> radius: f32;
    @group(0) @binding(5) var<uniform> projectionMatrix: mat4x4f;
    @group(0) @binding(6) var<uniform> viewMatrix: mat4x4f;

    fn getIndex(id: vec2u) -> u32 {
        return (id.y % grid.y) * grid.x + (id.x % grid.x);
    }

    @compute @workgroup_size(8, 8, 1)
    fn main(@builtin(global_invocation_id) id: vec3u){
        let index = getIndex(id.xy);
        if(index >= arrayLength(&points)){
            return;
        }
        let point = projectionMatrix * viewMatrix * vec4f(points[index], 0, 1);
        //将 ndc 坐标系下的 point 坐标转换为屏幕空间的像素坐标，其中像素坐标的原点位于屏幕的左下方
        let pc = (point.xy / point.w + vec2f(1, 1)) / 2.0f * resolution ;

        //遍历 point 像素半径覆盖的各个像素
        let r = i32(radius);
        let w = i32(resolution.x);
        let h = i32(resolution.y);
        let si = max(0, i32(pc.x) - r);
        let ei = min(w - 1, i32(pc.x) + r);
        let sj = max(0, i32(pc.y) - r);
        let ej = min(h - 1, i32(pc.y) + r);
        for(var i = si; i <= ei; i++){
            for(var j = sj; j <= ej; j++){
                let d = pow(pow(f32(i) - pc.x, 2) + pow(f32(j) - pc.y, 2), 0.5);
                var h = step(d / radius, 1) * (1 - d / radius);
                h = pow(h, 1.5);
                let outIdx = u32(j) * u32(resolution.x) + u32(i);
                let v = u32(step(0, h) * h * prec);
                atomicAdd(&heatValueArr[outIdx], v);
            }
        }
    }
`

export const computeMaxHeatValueShaderCode = `
    @group(0) @binding(0) var<storage, read> heatValueArr: array<u32>;
    @group(0) @binding(1) var<storage, read_write> actualMaxHeat: array<atomic<u32>>;
    @group(0) @binding(2) var<uniform> resolution: vec2f;

    @compute @workgroup_size(1, 1, 1)
    fn main(@builtin(global_invocation_id) id: vec3u){
        let grid = vec2u(u32(resolution.x), u32(resolution.y));
        let row = id.x;
        var res = 0u;
        for(var i = 0; i < i32(grid.x); i++){
            let index = (row % grid.y) * grid.x + u32(i);
            res = max(heatValueArr[index], res);
        }
        atomicMax(&actualMaxHeat[0], res);
    }
`

export const renderShaderCode = `
    @group(0) @binding(0) var<storage, read> heatValueArr: array<u32>;
    @group(0) @binding(1) var<uniform> maxHeatValue: f32;
    @group(0) @binding(2) var<uniform> resolution: vec2f;
    //color.a 为 颜色插值时对应的 offset 取值范围为0到1
    @group(0) @binding(3) var<uniform> colors: array<vec4f, 5>;
    @group(0) @binding(4) var<uniform> maxHeatValueRatio: f32;
    @group(0) @binding(5) var<storage, read> actualMaxHeat: array<u32>;

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
        _ = colors;
        _ = maxHeatValueRatio;
        let positions = array(
            vec2f(-1, -1),
            vec2f(1, 1),
            vec2f(-1, 1),
            vec2f(-1, -1),
            vec2f(1, -1),
            vec2f(1, 1),
        );

        return vec4f(positions[vi], 0, 1);
    }

    @fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f{
        let index = u32(resolution.y - pos.y) * u32(resolution.x) + u32(pos.x);
        let maxValue = select(f32(actualMaxHeat[0]) / ${heatValuePrec}, maxHeatValue, maxHeatValue > 0) * maxHeatValueRatio;
        var val = f32(heatValueArr[index]) / maxValue / ${heatValuePrec}f;
        if(val == 0){
            discard;
        }
        let color = interpColor(val);
        return color * val;
    }
`
