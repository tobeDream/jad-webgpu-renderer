# jad-webgpu-visualization-renderer

A webgpu renderer for data visualization

## Installation

```bash
npm install jad-webgpu-visualization-renderer
```

## Usage

```ts
//init
import { Renderer, Scene, Points } from 'jad-webgpu-visualization-renderer'
import { PerspectiveCamera } from 'three'

const renderer = new Renderer({ canvas })
const scene = new Scene()
//you can use THREE.PerspectiveCamera or OrthographicCamera
const camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000)
camera.position.set(0, 0, 100)

//add Points Model
const positions = new Float32Array([30, 20, 20, -20]) //draw two points
const sizes = new Float32Array([25, 15]) //set size in pixel
const colors = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]) //set the first point's color to red, the second to green
const points = new Points({
	positions,
	sizes,
	colors,
	material: {
		blending: 'normalBlending'
	}
})
scene.addModel(points)

//draw the two points to the canvas
renderer.render(camera, scene)
```

## TODO

1. draw lines with width
