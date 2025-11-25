import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

interface AngleBracketProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    id: string;
    selectedHoleIndex?: number | null;
    onHoleClick?: (e: ThreeEvent<MouseEvent>, holeIndex: number) => void;
    isSelected?: boolean;
    onPartClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const HOLE_SPACING = 12.7; // mm
const STRIP_WIDTH = 12.7; // mm
const HOLE_RADIUS = 4.1 / 2; // mm
const THICKNESS = 1; // mm

export function AngleBracket({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#e74c3c', id, selectedHoleIndex, onHoleClick, isSelected, onPartClick }: AngleBracketProps) {
    // Flange 1 (Base) Shape
    const shape1 = useMemo(() => {
        const s = new THREE.Shape();
        const radius = STRIP_WIDTH / 2;
        const length = HOLE_SPACING / 2; // From center to bend

        // Rounded end at x=0
        s.absarc(0, 0, radius, Math.PI / 2, Math.PI * 1.5);
        // Straight to bend
        s.lineTo(length, -radius);
        s.lineTo(length, radius);
        s.lineTo(0, radius);

        // Hole 0
        const hole = new THREE.Path();
        hole.absarc(0, 0, HOLE_RADIUS, 0, Math.PI * 2, true);
        s.holes.push(hole);

        return s;
    }, []);

    const config = useMemo(() => ({
        depth: THICKNESS,
        bevelEnabled: false,
        curveSegments: 32
    }), []);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (onPartClick) {
            onPartClick(e);
        }
    };

    const handleHoleClick = (e: ThreeEvent<MouseEvent>, index: number) => {
        e.stopPropagation();
        if (onHoleClick) {
            onHoleClick(e, index);
        }
    };

    return (
        <group position={position} rotation={rotation}>
            <group onClick={handleClick}>
                {/* Flange 1 (Base) */}
                <mesh castShadow receiveShadow>
                    <extrudeGeometry args={[shape1, config]} />
                    <meshStandardMaterial
                        color={isSelected ? '#ff9f43' : color}
                        metalness={0.6}
                        roughness={0.4}
                        emissive={isSelected ? '#442200' : '#000000'}
                    />
                </mesh>

                {/* Flange 2 (Upright) */}
                <mesh
                    position={[HOLE_SPACING / 2, 0, HOLE_SPACING / 2]}
                    rotation={[0, -Math.PI / 2, Math.PI]}
                    castShadow
                    receiveShadow
                >
                    <extrudeGeometry args={[shape1, config]} />
                    <meshStandardMaterial
                        color={isSelected ? '#ff9f43' : color}
                        metalness={0.6}
                        roughness={0.4}
                        emissive={isSelected ? '#442200' : '#000000'}
                    />
                </mesh>
            </group>

            {/* Hitboxes and Indicators */}

            {/* Hole 0 (Base) */}
            <mesh
                position={[0, 0, THICKNESS / 2]}
                rotation={[Math.PI / 2, 0, 0]}
                onClick={(e) => handleHoleClick(e, 0)}
            >
                <cylinderGeometry args={[HOLE_RADIUS, HOLE_RADIUS, THICKNESS + 0.2, 16]} />
                <meshBasicMaterial color="red" transparent opacity={0} />
            </mesh>

            {selectedHoleIndex === 0 && (
                <group position={[0, 0, 0]}>
                    <mesh position={[0, 0, THICKNESS + 0.02]}>
                        <ringGeometry args={[HOLE_RADIUS + 0.8, HOLE_RADIUS + 1.8, 32]} />
                        <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 0, -0.02]}>
                        <ringGeometry args={[HOLE_RADIUS + 0.8, HOLE_RADIUS + 1.8, 32]} />
                        <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )}

            {/* Hole 1 (Upright) */}
            <mesh
                position={[HOLE_SPACING / 2 - THICKNESS / 2, 0, HOLE_SPACING / 2]}
                rotation={[0, 0, Math.PI / 2]}
                onClick={(e) => handleHoleClick(e, 1)}
            >
                <cylinderGeometry args={[HOLE_RADIUS, HOLE_RADIUS, THICKNESS + 0.2, 16]} />
                <meshBasicMaterial color="red" transparent opacity={0} />
            </mesh>

            {selectedHoleIndex === 1 && (
                <group position={[HOLE_SPACING / 2, 0, HOLE_SPACING / 2]} rotation={[0, -Math.PI / 2, 0]}>
                    <mesh position={[0, 0, 0.02]}>
                        <ringGeometry args={[HOLE_RADIUS + 0.8, HOLE_RADIUS + 1.8, 32]} />
                        <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh position={[0, 0, THICKNESS + 0.02]}>
                        <ringGeometry args={[HOLE_RADIUS + 0.8, HOLE_RADIUS + 1.8, 32]} />
                        <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            )}
        </group>
    );
}
