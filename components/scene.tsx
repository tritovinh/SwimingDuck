"use client";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Model as Duck } from "./Duck";
import { Physics } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { Water } from "./Water";
import { Environment } from "@react-three/drei";

/** Orbit focus slightly above the duck's center */
const LOOK_OFFSET_Y = 0.35;

const MIN_DISTANCE = 1.2;
const MAX_DISTANCE = 18;
const MIN_PITCH = 0.12;
const MAX_PITCH = Math.PI / 2 - 0.08;
const HORIZONTAL_ROTATE_SENSITIVITY = 0.0045;
const VERTICAL_ROTATE_SENSITIVITY = 0.003;
const CAMERA_ROTATION_SMOOTHING = 14;
const ZOOM_SENSITIVITY = 0.012;

const lookTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

function DuckOrbitCamera({ targetRef }: { targetRef: React.RefObject<RapierRigidBody | null> }) {
	const { camera, gl } = useThree();
	const yawRef = useRef(0);
	const pitchRef = useRef(0.45);
	const targetYawRef = useRef(0);
	const targetPitchRef = useRef(0.45);
	const distanceRef = useRef(5.5);
	const dragRef = useRef({ active: false, pointerId: -1, lastX: 0, lastY: 0 });

	useEffect(() => {
		const el = gl.domElement;
		el.style.touchAction = "none";

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const next = THREE.MathUtils.clamp(
				distanceRef.current + e.deltaY * ZOOM_SENSITIVITY,
				MIN_DISTANCE,
				MAX_DISTANCE
			);
			distanceRef.current = next;
		};

		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0) return;
			dragRef.current = { active: true, pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
			el.setPointerCapture(e.pointerId);
		};

		const onPointerUp = (e: PointerEvent) => {
			if (e.pointerId !== dragRef.current.pointerId) return;
			dragRef.current.active = false;
			dragRef.current.pointerId = -1;
			try {
				el.releasePointerCapture(e.pointerId);
			} catch {
			}
		};

		const onPointerMove = (e: PointerEvent) => {
			const d = dragRef.current;
			if (!d.active || e.pointerId !== d.pointerId) return;
			const dx = e.clientX - d.lastX;
			const dy = e.clientY - d.lastY;
			d.lastX = e.clientX;
			d.lastY = e.clientY;
			targetYawRef.current -= dx * HORIZONTAL_ROTATE_SENSITIVITY;
			targetPitchRef.current = THREE.MathUtils.clamp(
				targetPitchRef.current + dy * VERTICAL_ROTATE_SENSITIVITY,
				MIN_PITCH,
				MAX_PITCH
			);
		};

		const onPointerCancel = (e: PointerEvent) => {
			if (e.pointerId === dragRef.current.pointerId) {
				dragRef.current.active = false;
				dragRef.current.pointerId = -1;
			}
		};

		const onLostPointerCapture = () => {
			dragRef.current.active = false;
			dragRef.current.pointerId = -1;
		};

		el.addEventListener("wheel", onWheel, { passive: false });
		el.addEventListener("pointerdown", onPointerDown);
		el.addEventListener("pointerup", onPointerUp);
		el.addEventListener("pointercancel", onPointerCancel);
		el.addEventListener("pointermove", onPointerMove);
		el.addEventListener("lostpointercapture", onLostPointerCapture);

		return () => {
			el.removeEventListener("wheel", onWheel);
			el.removeEventListener("pointerdown", onPointerDown);
			el.removeEventListener("pointerup", onPointerUp);
			el.removeEventListener("pointercancel", onPointerCancel);
			el.removeEventListener("pointermove", onPointerMove);
			el.removeEventListener("lostpointercapture", onLostPointerCapture);
		};
	}, [gl]);

	useFrame((_, delta) => {
		const body = targetRef.current;
		if (!body) return;
		const smoothing = 1 - Math.exp(-CAMERA_ROTATION_SMOOTHING * delta);
		yawRef.current = THREE.MathUtils.lerp(yawRef.current, targetYawRef.current, smoothing);
		pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitchRef.current, smoothing);

		const t = body.translation();
		lookTarget.set(t.x, t.y + LOOK_OFFSET_Y, t.z);

		const yaw = yawRef.current;
		const pitch = pitchRef.current;
		const r = distanceRef.current;

		const h = r * Math.cos(pitch);
		const y = r * Math.sin(pitch);
		camPos.set(lookTarget.x + h * Math.sin(yaw), lookTarget.y + y, lookTarget.z + h * Math.cos(yaw));

		camera.position.copy(camPos);
		camera.lookAt(lookTarget);
	});

	return null;
}

const Scene = () => {
	const duckBodyRef = useRef<RapierRigidBody>(null);

	return (
		<Canvas camera={{ position: [0, 4, 4], fov: 50 }}>
			<color attach="background" args={["#9a9ac2"]} />
			<fog attach="fog" args={["#9e7e9b", 10, 100]} />
			<Environment preset="dawn" />
			<DuckOrbitCamera targetRef={duckBodyRef} />
			<Physics gravity={[0, -10, 0]}>
				<Water />
				<Duck
					rigidBodyRef={duckBodyRef}
					colors={{
						body: "#ffffff",
						head: "#ffffff",
						beak: "#d0c130",
						scarf: "#0000ff",
						wing_l: "#ffffff",
						wing_r: "#ffffff",
						eye_l: "#000000",
						eye_r: "#000000",
					}}
				/>
			</Physics>
		</Canvas>
	);
};

export default Scene;
