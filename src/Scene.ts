import { Object3D } from './Object3D'
import Model from './Model'

class Scene extends Object3D {
	private _modelList: Model[]
	constructor() {
		super()
		this._modelList = []
	}

	get modelList() {
		return this._modelList.sort((m, n) => (m.renderOrder > n.renderOrder ? -1 : 1))
	}

	public addModel(model: Model) {
		if (!this._modelList.includes(model)) this._modelList.push(model)
	}

	public removeModel(model: Model) {
		const index = this._modelList.indexOf(model)
		if (index > -1) {
			this._modelList.splice(index, 1)
		}
	}

	public getModel(id: string) {}
}

export default Scene
