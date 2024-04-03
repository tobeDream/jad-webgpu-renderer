import { OrthographicCamera, PerspectiveCamera, Vector2 } from 'three'
import Renderer from '../Renderer'
import Scene from '../Scene'
import Points from '../Points'
import Line from '../Line'

//@ts-ignore
window.V = Vector2

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

const renderer = new Renderer({ canvas, antiAlias: true, clearColor: [0, 0, 0, 0.5] })
const scene = new Scene()
//@ts-ignore
window.r = renderer
//@ts-ignore
window.s = scene

// const pos = new Float32Array([30, 20, 0, 20, 0, 0, -40, 0])
const num = 40
const pos = new Float32Array(num * 2)
const color = new Uint8Array(num * 4)
const size = new Float32Array(num)
for (let i = 0; i < num; ++i) {
	pos[2 * i] = (640 / num) * i - 320
	pos[2 * i + 1] = Math.sin(((2 * Math.PI) / num) * i) * 100
	color[i * 4 + 0] = 255
	color[i * 4 + 1] = ((num - i) / num) * 255
	color[i * 4 + 2] = 0
	color[i * 4 + 3] = 255
	size[i] = Math.abs(Math.sin(((2 * Math.PI) / num) * i)) * 15 + 15
}

const line = new Line({
	positions: pos,
	material: { color: [0.0, 0.0, 1, 0.5], lineWidth: 10, blending: 'normalBlending' }
})
const points = new Points({
	positions: pos,
	colors: color,
	sizes: size,
	material: {
		color: [1, 1, 0, 1],
		blending: 'normalBlending',
		size: 25,
		highlightSize: 40,
		highlightColor: [1, 0, 0, 0.5]
	}
})
scene.addModel(points)
scene.addModel(line)

const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
camera.position.set(0, 0, 500)
//@ts-ignore
window.c = camera

renderer.render(camera, scene)

setTimeout(() => {
	line.material.updateUniform('color', [1, 0, 0, 0.5])
	points.highlights([1, 5, 20, 33])
	renderer.render(camera, scene)
}, 3000)
