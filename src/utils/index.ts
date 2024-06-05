import { Color } from '@/types'
import * as moment from 'moment'
import { TypedArray } from 'three'

export const genId = () => {
	return moment().valueOf() + '_' + ((Math.random() * 1000000) | 0)
}

export const minUniformBufferOffsetAlignment = 256

export const minStorageBufferOffsetAlignment = 256

export const binarySearch = (
	arr: TypedArray | Array<number | string>,
	target: number | string,
	compare: 'less' | 'more' = 'less'
) => {
	function traverse(si: number, ei: number): number {
		if ((arr[si] > target && compare === 'less') || (arr[ei] < target && compare === 'more')) return -1
		if (si + 1 === ei) {
			if (arr[si] <= target && compare === 'less') return si
			if (arr[ei] >= target && compare === 'more') return ei
		}
		const mid = si + Math.ceil((ei - si) / 2)
		return arr[mid] > target ? traverse(si, mid) : traverse(mid, ei)
	}
	return traverse(0, arr.length - 1)
}

export const convertUniformColor = <T extends Color | undefined>(c: T): T => {
	if (c === undefined) return undefined as T
	const res: number[] = []
	if (c.some((i) => i > 1)) {
		for (let i = 0; i < 3; ++i) res.push(c[i] / 255)
		res.push(c[3])
	} else res.push(...c)
	return res as T
}
