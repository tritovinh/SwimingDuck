import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export function Water() {
    return (
        <RigidBody type="fixed" position={[0, -0.15, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[300, 300, 32, 32]} />
                <meshStandardMaterial 
                    color={new THREE.Color(0, 0.8, 1)}
                    transparent={true}
                    opacity={0.6}
                    flatShading={true}
                    roughness={0.2}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </RigidBody>
    );
}