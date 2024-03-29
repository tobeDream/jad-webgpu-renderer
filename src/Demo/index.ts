import { NormalBlending, PerspectiveCamera } from 'three'
import Renderer from '../Renderer'
import Scene from '../Scene'
import Points from '../Points'

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

const renderer = new Renderer({ canvas })
const scene = new Scene()
//@ts-ignore
window.r = renderer
//@ts-ignore
window.s = scene

const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
camera.position.set(0, 0, 100)
//@ts-ignore
window.c = camera

const rand = (min: number, max: number) => min + Math.random() * (max - min)
function createPoints(num: number) {
	const kNumPoints = 100
	const positionData = new Float32Array(kNumPoints * 2)
	const colorData = new Uint8Array(kNumPoints * 4)
	const sizeData = new Float32Array(kNumPoints)
	for (let i = 0; i < kNumPoints; ++i) {
		positionData[i * 2 + 0] = num === 1 ? rand(-60, -5) : rand(5, 60)
		positionData[i * 2 + 1] = rand(-40, 40)
		sizeData[i] = rand(25, 25) //size
		colorData[i * 4 + 0] = (num - 1) * 255 // rand(0, 1) * 255
		colorData[i * 4 + 1] = (2 - num) * 255 //rand(0, 1) * 255
		colorData[i * 4 + 2] = 0 // rand(0, 1) * 255
		colorData[i * 4 + 3] = 0.8 * 255
	}

	const points = new Points({
		positions: positionData,
		sizes: sizeData,
		colors: colorData,
		material: {
			blending: 'additiveBlending'
		}
	})

	scene.addModel(points)
}

createPoints(1)
createPoints(2)

setTimeout(() => {
	renderer.render(camera, scene)
}, 500)

setTimeout(() => {
	const sizeAttr = scene.modelList[0].geometry.getAttribute('size')
	if (sizeAttr) {
		sizeAttr.array[0] = 50
		sizeAttr.needsUpdate = true
		renderer.render(camera, scene)
	}
}, 4000)
