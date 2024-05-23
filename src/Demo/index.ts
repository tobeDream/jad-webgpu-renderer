import { Vector2 } from 'three'
import PerspectiveCamera from '@/camera/perspectiveCamera'
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
const renderer = new Renderer({ canvas, antiAlias: false, clearColor: [0, 0, 0, 0.3] })
//@ts-ignore
window.r = renderer

// const pos = new Float32Array([30, 20, 0, 20, 0, 0, -40, 0])
const num = 100000
const pos = new Float32Array(num * 2)
const color = new Uint8Array(num * 4)
const size = new Float32Array(num)
for (let i = 0; i < num; ++i) {
	// pos[2 * i] = (800 / num) * i - 400
	// pos[2 * i + 1] = Math.sin(((2 * Math.PI) / num) * i) * 100
	pos[2 * i] = (Math.random() * 2 - 1) * 400
	pos[2 * i + 1] = (Math.random() * 2 - 1) * 200
	color[i * 4 + 0] = 255
	color[i * 4 + 1] = ((num - i) / num) * 255
	color[i * 4 + 2] = 0
	color[i * 4 + 3] = 155
	size[i] = Math.abs(Math.sin(((2 * Math.PI) / num) * i)) * 25 + 10
}

// const line = new Line({
// 	positions: pos.map((p, i) => (i % 2 === 1 ? p * 1.3 : p)),
// 	material: { color: [0.0, 0.9, 1, 0.7], lineWidth: 10, blending: 'normalBlending' }
// })
// const points = new Points({
// 	positions: pos.map((p, i) => (i % 2 === 1 ? p * 1.5 : p)),
// 	colors: color,
// 	sizes: size,
// 	material: {
// 		color: [1, 1, 0, 0.7],
// 		blending: 'normalBlending',
// 		// size: 10,
// 		highlightSize: 40,
// 		highlightColor: [1, 0, 0, 0.5]
// 	}
// })
const heat = new Heatmap({
	points: pos.map((p, i) => (i % 2 === 1 ? p * -1 : p * 0.9)),
	material: {
		radius: 40
	}
})
//@ts-ignore
// window.h = heat

// scene.addModel(line)
// scene.addModel(points)
scene.addModel(heat)

renderer.render(scene, camera)

setTimeout(() => {
	// points.highlights([1, 10, 30, 50])
	// renderer.render(scene, camera)
}, 2000)
