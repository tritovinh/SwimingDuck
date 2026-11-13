import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { SPAWN_X, getTerrainHeight, getWaterHeight } from '@/lib/world'

const FORWARD_SPEED = 3.5
// turn left and right
const TURN_SPEED = 2.5
const SHORE_HEIGHT = -0.5

const scratchQuat = new THREE.Quaternion()
const scratchForward = new THREE.Vector3(0, 0, -1)

type GLTFResult = GLTF & {
	nodes: {
		body: THREE.Mesh
		head: THREE.Mesh
		eye_l: THREE.Mesh
		eye_r: THREE.Mesh
		beak: THREE.Mesh
		Torus: THREE.Mesh
		wing_l: THREE.Mesh
		wing_r: THREE.Mesh
	}
	materials: {
		Mat_body: THREE.MeshStandardMaterial
		Mat_eye: THREE.MeshStandardMaterial
		Mat_beak: THREE.MeshStandardMaterial
		Mat_scarf: THREE.MeshStandardMaterial
	}
	animations: THREE.AnimationClip[]
}

export interface DuckColors {
	body?: string | THREE.Color
	head?: string | THREE.Color
	eye_l?: string | THREE.Color
	eye_r?: string | THREE.Color
	beak?: string | THREE.Color
	scarf?: string | THREE.Color
	wing_l?: string | THREE.Color
	wing_r?: string | THREE.Color
}

export function Model(
	props: React.ComponentProps<'group'> & {
		colors?: DuckColors
		rigidBodyRef?: React.RefObject<RapierRigidBody | null>
	}
) {
	const { nodes, materials } = useGLTF('/duck.glb') as unknown as GLTFResult
	const { colors, rigidBodyRef: rigidBodyRefProp, ...groupProps } = props
	const internalRigidRef = useRef<RapierRigidBody>(null)
	const rigidBodyRef = rigidBodyRefProp ?? internalRigidRef

	const groupRef = useRef<THREE.Group>(null);
	const pressedKeysRef = useRef<Set<string>>(new Set())

	useEffect(() => {
		const pressed = pressedKeysRef.current

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyD') {
				pressed.add(e.code)
			}
		}
		const onKeyUp = (e: KeyboardEvent) => {
			pressed.delete(e.code)
		}
		const onBlur = () => {
			pressed.clear()
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('blur', onBlur)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('blur', onBlur)
		}
	}, [])

	const bodyMaterial = materials.Mat_body.clone()
	if (colors?.body) bodyMaterial.color = new THREE.Color(colors.body)

	const headMaterial = nodes.head.material ? (nodes.head.material as THREE.MeshStandardMaterial).clone() : bodyMaterial.clone()
	if (colors?.head) headMaterial.color = new THREE.Color(colors.head)

	const eyeLMaterial = materials.Mat_eye.clone()
	if (colors?.eye_l) eyeLMaterial.color = new THREE.Color(colors.eye_l)

	const eyeRMaterial = materials.Mat_eye.clone()
	if (colors?.eye_r) eyeRMaterial.color = new THREE.Color(colors.eye_r)

	const beakMaterial = materials.Mat_beak.clone()
	if (colors?.beak) beakMaterial.color = new THREE.Color(colors.beak)

	const scarfMaterial = materials.Mat_scarf.clone()
	if (colors?.scarf) scarfMaterial.color = new THREE.Color(colors.scarf)

	const wingLMaterial = materials.Mat_body.clone()
	if (colors?.wing_l) wingLMaterial.color = new THREE.Color(colors.wing_l)

	const wingRMaterial = nodes.wing_r.material ? (nodes.wing_r.material as THREE.MeshStandardMaterial).clone() : materials.Mat_body.clone()
	if (colors?.wing_r) wingRMaterial.color = new THREE.Color(colors.wing_r)

	useFrame(({ clock }) => {
		const body = rigidBodyRef.current
		if (!body) return

		const pressed = pressedKeysRef.current
		const position = body.translation()
		const velocity = body.linvel()
		const rot = body.rotation()

		if (pressed.has('KeyW')) {
			scratchForward.set(0, 0, -FORWARD_SPEED).applyQuaternion(scratchQuat.set(rot.x, rot.y, rot.z, rot.w))
			velocity.x = scratchForward.x
			velocity.z = scratchForward.z
		}
		if (getTerrainHeight(position.x + Math.sign(velocity.x) * 0.5, position.z) > SHORE_HEIGHT) velocity.x = 0
		if (getTerrainHeight(position.x, position.z + Math.sign(velocity.z) * 0.5) > SHORE_HEIGHT) velocity.z = 0
		velocity.y = (getWaterHeight(position.x, position.z, clock.getElapsedTime()) + 0.1 - position.y) * 10

		const turn = Number(pressed.has('KeyA')) - Number(pressed.has('KeyD'))
		body.setLinvel(velocity, true)
		body.setAngvel({ x: 0, y: turn * TURN_SPEED, z: 0 }, true)
	})

	return (
		<RigidBody
			ref={rigidBodyRef}
			position={[SPAWN_X, 0.2, 0]}
			colliders="hull"
			linearDamping={3}
			gravityScale={0}
			enabledRotations={[false, true, false]}
		>
			<group {...groupProps} dispose={null} scale={1} ref={groupRef} rotation={[0, -Math.PI/2, 0]}>
				<mesh geometry={nodes.body.geometry} material={bodyMaterial} position={[0.054, -0.027, 0.024]} rotation={[-Math.PI, 0, -Math.PI]} scale={[-0.378, -0.225, -0.234]} />
				<mesh geometry={nodes.head.geometry} material={headMaterial} position={[-0.184, 0.36, 0.025]} rotation={[0, 0, -0.178]} scale={0.174} />
				<mesh geometry={nodes.eye_l.geometry} material={eyeLMaterial} position={[-0.274, 0.385, 0.119]} scale={[-0.023, -0.014, -0.025]} />
				<mesh geometry={nodes.eye_r.geometry} material={eyeRMaterial} position={[-0.275, 0.391, -0.073]} rotation={[-Math.PI, 0, 0]} scale={[0.023, 0.014, 0.025]} />
				<mesh geometry={nodes.beak.geometry} material={beakMaterial} position={[-0.184, 0.36, 0.025]} rotation={[0, 0, -0.178]} scale={0.174} />
				<mesh geometry={nodes.Torus.geometry} material={scarfMaterial} position={[-0.134, 0.202, 0.024]} rotation={[-0.033, 0.032, 0.306]} scale={0.191} />
				<mesh geometry={nodes.wing_l.geometry} material={wingLMaterial} position={[0.042, 0.005, 0.179]} rotation={[-0.316, -0.055, 0.13]} scale={[0.349, 0.206, 0.349]} />
				<mesh geometry={nodes.wing_r.geometry} material={wingRMaterial} position={[0.04, -0.002, -0.135]} rotation={[0.319, 0.018, -3.087]} scale={[-0.361, -0.213, -0.361]} />
			</group>

		</RigidBody>
	)
}

useGLTF.preload('/duck.glb')
