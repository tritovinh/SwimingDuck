import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'

// Forward impulse
const THRUST_IMPULSE = 0.5
// turn left and right
const TURN_IMPULSE_Y = 0.01

type PaddleAction = 'forward' | 'turnLeft' | 'turnRight'

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
	animations: any[]
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

const getWaterHeight = (x: number, z: number, time: number): number => {
	return Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.3 + time) * 0.2;
};

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
	const paddleQueueRef = useRef<PaddleAction[]>([])

	useEffect(() => {
		const queue = paddleQueueRef.current
		const enqueue = (action: PaddleAction) => queue.push(action)

		const onKeyDown = (e: KeyboardEvent) => {
			switch (e.code) {
				case 'KeyW':
					enqueue('forward')
					break
				case 'KeyA':
					enqueue('turnLeft')
					break
				case 'KeyD':
					enqueue('turnRight')
					break
			}
		}
		const onBlur = () => {
			queue.length = 0
		}
		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('blur', onBlur)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
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
		if (!rigidBodyRef.current) return;

		const body = rigidBodyRef.current;
		const queue = paddleQueueRef.current

		if (queue.length > 0) {
			const rot = body.rotation()
			scratchQuat.set(rot.x, rot.y, rot.z, rot.w)

			for (let i = 0; i < queue.length; i++) {
				const action = queue[i]
				if (action === 'forward') {
					scratchForward.set(0, 0, -1).applyQuaternion(scratchQuat)
					scratchForward.y = 0
					if (scratchForward.lengthSq() < 1e-10) scratchForward.set(0, 0, -1)
					scratchForward.multiplyScalar(THRUST_IMPULSE)
					body.applyImpulse({ x: scratchForward.x, y: 0, z: scratchForward.z }, true)
				} else if (action === 'turnLeft') {
					body.applyTorqueImpulse({ x: 0, y: TURN_IMPULSE_Y, z: 0 }, true)
				} else if (action === 'turnRight') {
					body.applyTorqueImpulse({ x: 0, y: -TURN_IMPULSE_Y, z: 0 }, true)
				}
			}
			queue.length = 0
		}

		const time = clock.getElapsedTime();
		const position = body.translation();
		const currentWaterHeight = getWaterHeight(position.x, position.z, time);
		const targetY = currentWaterHeight + 0.1;

		const diff = targetY - position.y;
		const force = diff * 50;

		body.applyImpulse({ x: 0, y: force * 0.01, z: 0 }, true);

		const velocity = body.linvel();
		body.setLinvel(
			{
				x: velocity.x * 0.95,
				y: velocity.y * 0.9,
				z: velocity.z * 0.95,
			},
			true
		);
	});

	return (
		<RigidBody
			ref={rigidBodyRef}
			position={[0, 0.2, 0]}
			colliders="hull"
			linearDamping={0.5}
			angularDamping={5}
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
