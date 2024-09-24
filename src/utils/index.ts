import { Color } from '@/types'
import * as moment from 'moment'
import { TypedArray } from 'three'
import * as _ from 'lodash'

export const genId = () => {
	return moment().valueOf() + '_' + ((Math.random() * 1000000) | 0)
}

export const minUniformBufferOffsetAlignment = 256

export const minStorageBufferOffsetAlignment = 256

export const indexFormat = 'uint32'

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

export const deepMerge = <T>(...obj: Partial<T>[]): T => {
	return _.merge({}, ...obj)
}

/**
 * 将四个 uint8 数值打包成一个 uint32 数值
 * 使用小端字节序，即 [a, b, c, d] => (d << 24) | (c << 16) | (b << 8) | a
 *  如果 data 为 color 存放[r, g, b, a] 四个通道的分量，那么通道 r 的值位于 uint32的最低四个字节中
 * @example packUint8ToUint32([255, 0, 0, 0]) => 4278190080
 * @param {number[]} data 一个长度为四的 uint8 数组
 * @returns {number} 一个 uint32数值
 */
export const packUint8ToUint32 = (data: [number, number, number, number]) => {
	let res = 0
	for (let i = 0; i < data.length; ++i) {
		res += (data[i] & 255) << (i * 8)
	}
	return res
}

/**
 * 将一个 uint32 数值分解成四个 uint8 数值
 * 使用小端字节序，即 num => [(num >> 0) & 255, (num >> 8) & 255, (num >> 16) & 255, (num >> 24) & 255]
 * @example unpackUint32ToUint8(4278190080) => [255, 0, 0, 0]
 * @param {number} num 一个 uint32数值
 * @returns {[number, number, number, number]} 一个长度为四的 uint8 数组
 */
export const unpackUint32ToUint8 = (num: number) => {
	let res: [number, number, number, number] = [0, 0, 0, 0]
	for (let i = 0; i < 4; ++i) {
		res[i] = (num >> (i * 8)) & 255
	}
	return res
}

console.log(packUint8ToUint32([1, 0, 0, 1]))
