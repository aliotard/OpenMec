import { useMemo } from 'react';
import * as THREE from 'three';

export function Screw({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#bdc3c7' }: { position?: [number, number, number], rotation?: [number, number, number], color?: string }) {
    return (
        <group position={position} rotation={rotation}>
            {/* Head: Z range [0, -2] (going up in world Y if local Z is -Y) */}
            <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[3, 3, 2, 32]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Shaft: Z range [0, 10] (going down in world Y if local Z is -Y) */}
            <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[1.9, 1.9, 10, 16]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Slot (visual detail) */}
            <mesh position={[0, 0, -2.1]}>
                <boxGeometry args={[4, 0.5, 0.5]} />
                <meshStandardMaterial color="#555" />
            </mesh>
        </group>
    );
}

export function Nut({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#bdc3c7' }: { position?: [number, number, number], rotation?: [number, number, number], color?: string }) {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        const radius = 3.5;
        const sides = 6;

        // Create hexagon
        for (let i = 0; i < sides; i++) {
            const angle = (i * Math.PI * 2) / sides;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) s.moveTo(x, y);
            else s.lineTo(x, y);
        }
        s.closePath();

        // Hole
        const hole = new THREE.Path();
        hole.absarc(0, 0, 2, 0, Math.PI * 2, true);
        s.holes.push(hole);

        return s;
    }, []);

    return (
        <group position={position} rotation={rotation}>
            {/* Nut: Z range [0, 2] (going down in world Y if local Z is -Y) */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <extrudeGeometry args={[shape, { depth: 2, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2 }]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
            </mesh>
        </group>
    );
}
