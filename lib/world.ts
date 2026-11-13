import { createNoise2D } from 'simplex-noise'

export const CHUNK_SIZE = 32
export const SAND_HEIGHT = 0.5
const SEABED_HEIGHT = -1.5

let seed = 1
const noise2D = createNoise2D(() => (seed = (seed * 16807) % 2147483647) / 2147483647)

export const getWaterHeight = (x: number, z: number, time: number) =>
	Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.3 + time) * 0.2

export const getTerrainHeight = (x: number, z: number) => {
	const noise =
		noise2D(x * 0.055, z * 0.055) + noise2D(x * 0.11, z * 0.11) * 0.5 + noise2D(x * 0.22, z * 0.22) * 0.25
	return Math.max(SEABED_HEIGHT, (noise / 1.75 - 0.2) * 5)
}

export const SPAWN_X = (() => {
	let x = 0
	while ([-2, 0, 2].some((d) => getTerrainHeight(x + d, 0) > SEABED_HEIGHT || getTerrainHeight(x, d) > SEABED_HEIGHT)) x++
	return x
})()
