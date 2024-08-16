import { Vector2 } from 'three'
import PerspectiveCamera from '@/camera/perspectiveCamera'
import Renderer from '../Renderer'
import Scene from '../Scene'
import Points from '../Points/Points'
// import { Path, Paths } from '../Paths'
import Heatmap from '../Heatmap/Heatmap'
// import * as moment from 'moment'

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
const renderer = new Renderer({ canvas, antiAlias: true, clearColor: [0, 0, 0, 0.3] })
//@ts-ignore
window.r = renderer

// const pos = new Float32Array([30, 20, 0, 20, 0, 0, -40, 0])
const totalTime = 20000
const num = 400
let pos = new Float32Array(num * 2)
const color = Array(num * 4).fill(0)
const size = new Uint8Array(num)
const timestamps = new Float32Array(num)
for (let i = 0; i < num; ++i) {
	pos[2 * i] = (800 / num) * i - 350
	pos[2 * i + 1] = Math.sin(((2 * Math.PI) / num) * i) * 100
	// pos[2 * i] = (Math.random() * 2 - 1) * 400
	// pos[2 * i + 1] = (Math.random() * 2 - 1) * 200
	color[i * 4 + 0] = 1
	color[i * 4 + 1] = ((num - i) / num) * 1
	color[i * 4 + 2] = 0
	color[i * 4 + 3] = 0.3
	size[i] = Math.abs(Math.sin(((2 * Math.PI) / num) * i)) * 10 + 10
	// size[i] = 10
	timestamps[i] = (totalTime / num) * i
}

// size[9] = 10
// size[8] = 10
// const path = new Path({
// 	positions: pos.map((p, i) => (i % 2 === 1 ? p * 1.3 : p)),
// 	timestamps,
// 	material: {
// 		color: [0.0, 0.9, 1, 0.7],
// 		lineWidth: 10,
// 		blending: 'normalBlending'
// 	}
// })

// const paths = new Paths([
// 	{
// 		positions: pos,
// 		timestamps,
// 		drawLine: false,
// 		drawHeadPoint: true,
// 		// colorBySpeed: true,
// 		material: {
// 			color: [255, 75, 42, 0.7],
// 			lineWidth: 10,
// 			headPointColor: [255, 25, 76, 0.6],
// 			headPointSize: 10,
// 			blending: 'normalBlending',
// 			tailDuration: (num * 20) / 10
// 		}
// 	},
// 	{
// 		positions: pos.map((p, i) => (i % 2 === 1 ? p * 1.3 : p)),
// 		timestamps: timestamps.map((t) => t - 1000),
// 		// drawLine: true,
// 		drawHeadPoint: true,
// 		// colorBySpeed: true,
// 		material: {
// 			color: [255, 225, 0, 0.7],
// 			lineWidth: 5,
// 			blending: 'normalBlending'
// 		}
// 	}
// ])

console.log(size)
pos = pos.map((p, i) => (i % 2 === 1 ? p * 1.5 : p))
const points = new Points({
	// position: pos.subarray(0, 100),
	// color: color.slice(0, 200),
	// radius: size.slice(0, 50),
	// startTime: timestamps.subarray(0, 50),
	position: pos,
	color,
	radius: size,
	startTime: timestamps,
	// total: 1000,
	style: {
		color: [1, 0.9, 0.2, 0.9],
		blending: 'normalBlending',
		radius: 10
	}
})
//@ts-ignore
window.p = points
// let i = 50
// const timer = setInterval(() => {
// 	if (i > num) {
// 		clearInterval(timer)
// 	} else {
// 		points.appendPoints({
// 			position: pos.subarray(i * 2, (i + 50) * 2),
// 			startTime: timestamps.subarray(i, i + 50)
// 		})
// 	}
// 	i += 50
// }, 500)
const heat = new Heatmap({
	points: pos.map((p, i) => (i % 2 === 1 ? p * -1 : p * 0.9)),
	// startTime: timestamps,
	style: {
		radius: 30,
		blur: 0.8,
		colorList: [
			[1, 0, 0, 0],
			[0.9, 0.9, 0, 0],
			[0.1, 0.8, 0.2, 0],
			[0, 0.0, 1.0, 0],
			[0, 0, 0, 0]
		],
		colorOffsets: [1, 0.85, 0.45, 0.25, 0],
		blending: 'normalBlending'
	}
})
//@ts-ignore
window.h = heat

// // line.visible = false
heat.renderOrder = 1
points.renderOrder = 0
// path.renderOrder = 2
scene.addModel(heat)
scene.addModel(points)
// scene.addModel(paths)

let interval = 60
let lastTimestamp = 0
let start = 0
const animate = (time: number) => {
	// console.log(time)
	if (start === 0) {
		lastTimestamp = time
		start = lastTimestamp
	}
	const timeElapsed = time - lastTimestamp
	if (timeElapsed >= interval) {
		points.updateCurrentTime(((time - start) * (totalTime / 400 / 20)) % timestamps[num - 1])
		heat.updateCurrentTime(((time - start) * (totalTime / 400 / 20)) % timestamps[num - 1])
		renderer.render(scene, camera)
		lastTimestamp = time
	}
	requestAnimationFrame(animate)
}
requestAnimationFrame(animate)

// setTimeout(() => {
// 	// points.highlights([1, 10, 30, 50])
// 	// renderer.render(scene, camera)
// 	p.setStyle({ color: [1, 1, 0, 1], radius: 50 }, [10, 30, 60, 100, 200, 300])
// }, 1000)

window.addEventListener('resize', renderer.resize)

//@ts-ignore
// window.f = (t) => {
// 	paths.updateTime(t)
// 	renderer.render(scene, camera)
// }
