"use client";
import { Canvas } from "@react-three/fiber";
import { Model as Duck } from "./Duck";
import { Physics, RigidBody } from "@react-three/rapier";
import { Water } from "./Water";
import { Environment, OrbitControls } from "@react-three/drei";

const Scene = () => {
	return (
		<Canvas 
			camera={{ position: [0, 2, 4], fov: 50 }}
		>
			<color attach="background" args={["#000000"]} />
			<fog attach="fog" args={["#537b88", 10, 100]} />
			<Environment preset="sunset" />
			<OrbitControls makeDefault enableZoom={false} />
			<Physics gravity={[0, 0, 0]}>
				<Water />
				<RigidBody 
					position={[0, -0.1, 0]}
					colliders="hull"
					linearDamping={2}
					angularDamping={0.1}
				>
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
				</RigidBody>
			</Physics>
		</Canvas>
	);
};

export default Scene;
