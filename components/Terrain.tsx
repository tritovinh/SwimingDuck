import { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { CHUNK_SIZE, SAND_HEIGHT, getTerrainHeight } from '@/lib/world'

const VIEW_RADIUS = 2
const SAND = new THREE.Color('#e8c84a')
const GRASS = new THREE.Color('#3d8c4a')

const TerrainChunk = ({ chunkX, chunkZ }: { chunkX: number; chunkZ: number }) => {
	const geometry = useMemo(() => {
		const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE)
		geometry.rotateX(-Math.PI / 2)

		const positions = geometry.attributes.position
		const colors = new Float32Array(positions.count * 3)

		for (let i = 0; i < positions.count; i++) {
			const height = getTerrainHeight(
				chunkX * CHUNK_SIZE + positions.getX(i),
				chunkZ * CHUNK_SIZE + positions.getZ(i)
			)
			const color = height < SAND_HEIGHT ? SAND : GRASS
			positions.setY(i, height)
			color.toArray(colors, i * 3)
		}

		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
		return geometry
	}, [chunkX, chunkZ])

	return (
		<mesh geometry={geometry} position={[chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE]}>
			<meshStandardMaterial vertexColors flatShading roughness={0.95} />
		</mesh>
	)
}

export const Terrain = ({ targetRef }: { targetRef: React.RefObject<RapierRigidBody | null> }) => {
	const [center, setCenter] = useState({ x: 0, z: 0 })

	useFrame(() => {
		const position = targetRef.current?.translation()
		if (!position) return

		const x = position.x / CHUNK_SIZE
		const z = position.z / CHUNK_SIZE
		if (Math.abs(x - center.x) > 0.6 || Math.abs(z - center.z) > 0.6) {
			setCenter({ x: Math.round(x), z: Math.round(z) })
		}
	})

	const chunks = []
	for (let z = center.z - VIEW_RADIUS; z <= center.z + VIEW_RADIUS; z++) {
		for (let x = center.x - VIEW_RADIUS; x <= center.x + VIEW_RADIUS; x++) {
			chunks.push(<TerrainChunk key={`${x},${z}`} chunkX={x} chunkZ={z} />)
		}
	}
	return <>{chunks}</>
}
