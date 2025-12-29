import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const Water = () => {
	const meshRef = useRef<THREE.Mesh>(null!)
	const { geometry } = useMemo(() => {
		const geo = new THREE.PlaneGeometry(100, 100, 80, 80)
		geo.rotateX(-Math.PI / 2)
		return { geometry: geo }
	}, [])

	useFrame(({ clock }) => {
		const positions = meshRef.current.geometry.attributes.position
		const time = clock.getElapsedTime()

		for (let i = 0; i < positions.count; i++) {
			const x = positions.getX(i)
			const z = positions.getZ(i)


			const wave = Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.3 + time) * 0.2
			positions.setY(i, wave)
		}
		positions.needsUpdate = true
		meshRef.current.geometry.computeVertexNormals()
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
				metalness={0.1}
				roughness={0.1}
				side={THREE.DoubleSide}
			/>
		</mesh>
	)
}