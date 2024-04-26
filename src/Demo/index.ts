import { PerspectiveCamera, Vector2 } from 'three'
import Renderer from '../Renderer'
import Scene from '../Scene'
import Points from '../Points'
import Line from '../Line'
import Heatmap from '../Heatmap'

//@ts-ignore
window.V = Vector2

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 10000)
camera.position.set(0, 0, 500)
//@ts-ignore
window.c = camera

const scene = new Scene()
//@ts-ignore
window.s = scene
const renderer = new Renderer({ camera, scene, canvas, antiAlias: true, clearColor: [0, 0, 0, 0.3] })
//@ts-ignore
window.r = renderer

// const pos = new Float32Array([30, 20, 0, 20, 0, 0, -40, 0])
const num = 50000000
const pos = new Float32Array(num * 2)
// const color = new Uint8Array(num * 4)
const size = new Float32Array(num)
for (let i = 0; i < num; ++i) {
	pos[2 * i] = (800 / num) * i - 400
	pos[2 * i + 1] = Math.sin(((2 * Math.PI) / num) * i) * 100
	// color[i * 4 + 0] = 255
	// color[i * 4 + 1] = ((num - i) / num) * 255
	// color[i * 4 + 2] = 0
	// color[i * 4 + 3] = 155
	size[i] = Math.abs(Math.sin(((2 * Math.PI) / num) * i)) * 1 + 2
}

// const line = new Line({
// 	positions: pos,
// 	material: { color: [0.0, 0.0, 1, 0.2], lineWidth: 10, blending: 'normalBlending' }
// })
const points = new Points({
	positions: pos,
	// colors: color,
	sizes: size,
	material: {
		color: [1, 1, 0, 0.1],
		blending: 'normalBlending',
		size: 2,
		highlightSize: 40,
		highlightColor: [1, 0, 0, 0.5]
	}
})
// const heat = new Heatmap({
// 	points: pos.map((p, i) => (i % 2 === 1 ? p * -1 : p * 0.9)),
// 	material: {
// 		radius: 45
// 	}
// })
//@ts-ignore
// window.h = heat

// scene.addModel(line)
scene.addModel(points)
// scene.addModel(heat)

// renderer.render()

setTimeout(() => {
	// points.highlights([1, 10, 30, 50])
	// renderer.render()
}, 2000)
