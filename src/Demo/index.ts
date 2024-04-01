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

const renderer = new Renderer({ canvas })
const scene = new Scene()
//@ts-ignore
window.r = renderer
//@ts-ignore
window.s = scene

// const pos = new Float32Array([30, 20, 0, 20, 0, 0, -40, 0])
const pos = new Float32Array([-40, 0, 30, 5, 0, 20, 30, 20])

const line = new Line({ positions: pos, material: { color: [1, 0, 0, 0.7], blending: 'normalBlending' } })
scene.addModel(line)
const points = new Points({
	positions: pos,
	material: {
		color: [1, 1, 0, 0.3],
		blending: 'normalBlending',
		size: 20
	}
})
scene.addModel(points)

const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
camera.position.set(0, 0, 500)
//@ts-ignore
window.c = camera

renderer.render(camera, scene)

const orth = new OrthographicCamera(100, 200, 200, 100, 100, 200)
console.log(orth.projectionMatrix.elements)
