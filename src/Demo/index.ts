import { PerspectiveCamera, Matrix4, Vector4 } from 'three'
import Renderer from '../Renderer'
import Scene from '../Scene'
import Heatmap from '../Heatmap'
import Points from '../Points'

//@ts-ignore
window.m = Matrix4
//@ts-ignore
window.v = Vector4

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight
console.log(canvas.width, canvas.height)

const scene = new Scene()
//@ts-ignore
window.r = renderer
//@ts-ignore
window.s = scene

const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 10000)
camera.position.set(0, 0, 500)
//@ts-ignore
window.c = camera

const renderer = new Renderer({ camera, scene, canvas, antiAlias: true, clearColor: [0, 0, 0, 0.5] })

const s = new Date().valueOf()
const num = 10000
const points = new Float32Array(num * 2)

points[0] = 0.2
points[1] = 0
points[2] = 0.5
points[3] = 0
for (let i = 2; i < num; ++i) {
	points[i * 2] = Math.random() * 600 - 300
	points[i * 2 + 1] = Math.random() * 200 - 100
}

console.log(new Date().valueOf() - s)
const h = new Heatmap({
	points,
	material: {
		radius: 15,
		maxHeatValueRatio: 1
	}
})
console.log(new Date().valueOf() - s)

scene.addModel(h)
//@ts-ignore
window.h = h

renderer.render()
console.log(new Date().valueOf() - s)

// setTimeout(() => {
// 	h.material.updateUniform('maxHeatValue', 2)
// 	renderer.render(camera, scene)
// }, 3000)
