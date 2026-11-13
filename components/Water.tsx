import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { getWaterHeight } from '@/lib/world'

const SIZE = 160
const STEP = 1.25

export const Water = ({ targetRef }: { targetRef: React.RefObject<RapierRigidBody | null> }) => {
	const meshRef = useRef<THREE.Mesh>(null!)
	const { geometry } = useMemo(() => {
		const geo = new THREE.PlaneGeometry(SIZE, SIZE, SIZE / STEP, SIZE / STEP)
		geo.rotateX(-Math.PI / 2)
		return { geometry: geo }
	}, [])

	useFrame(({ clock }) => {
		const mesh = meshRef.current
		const target = targetRef.current?.translation()
		if (target) mesh.position.set(Math.round(target.x / STEP) * STEP, 0, Math.round(target.z / STEP) * STEP)

		const positions = mesh.geometry.attributes.position
		const time = clock.getElapsedTime()

		for (let i = 0; i < positions.count; i++) {
			const x = positions.getX(i) + mesh.position.x
			const z = positions.getZ(i) + mesh.position.z
			const wave = getWaterHeight(x, z, time)
			positions.setY(i, wave)
		}
		positions.needsUpdate = true
	})

	return (
		<mesh
			ref={meshRef}
		>
			<primitive object={geometry} />
			<meshStandardMaterial
				color="#006994"
				flatShading={true}
				transparent
				opacity={0.8}
				metalness={0}
				roughness={0.3}
				envMapIntensity={0.35}
				side={THREE.DoubleSide}
			/>
		</mesh>
	)
}