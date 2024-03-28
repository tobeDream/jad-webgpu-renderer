import { PerspectiveCamera } from 'three'
import Renderer from '../Renderer'
import Geometry from '../geometry/geometry'
import Attribute from '../geometry/attribute'
import PointMaterial from '../material/PointMaterial'
import Model from '../Model'

const canvas = document.querySelector('#canvas') as HTMLCanvasElement
canvas.width = canvas.offsetWidth
canvas.height = canvas.offsetHeight

const renderer = new Renderer({ canvas })

const rand = (min: number, max: number) => min + Math.random() * (max - min)

const kNumPoints = 100
const positionData = new Float32Array(kNumPoints * 2)
const colorData = new Uint8Array(kNumPoints * 4)
const sizeData = new Float32Array(kNumPoints)
for (let i = 0; i < kNumPoints; ++i) {
	const offset = i * 4
	positionData[offset + 0] = rand(-30, 30)
	positionData[offset + 1] = rand(-30, 30)
	sizeData[offset] = rand(15, 15) //size
	colorData[offset + 0] = rand(0, 1) * 255
	colorData[offset + 1] = rand(0, 1) * 255
	colorData[offset + 2] = rand(0, 1) * 255
	colorData[offset + 3] = 0.7 * 255
}

const geo = new Geometry()
geo.setAttribute('position', new Attribute(positionData, 2))
geo.setAttribute('size', new Attribute(sizeData, 1))
geo.setAttribute('color', new Attribute(colorData, 4))

//uniforms
const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
camera.position.set(0, 0, 100)
const projectionMat = camera.projectionMatrix
const viewMat = camera.matrixWorldInverse
//@ts-ignore
window.c = camera
