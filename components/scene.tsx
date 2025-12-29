"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Model as Duck } from "./Duck";
import { Physics, RigidBody } from "@react-three/rapier";
import { Water } from "./Water";
import { Environment, OrbitControls } from "@react-three/drei";

const Scene = () => {
	return (
		<Canvas
			camera={{ position: [0, 4, 4], fov: 45 }}
		>
			<color attach="background" args={["#9a9ac2"]} />
			<fog attach="fog" args={["#9e7e9b", 10, 100]} />
			<Environment preset="dawn" />
			<OrbitControls makeDefault enableZoom={false} />
			<Physics gravity={[0, -10, 0]}>
				<Water />
					<Duck
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
