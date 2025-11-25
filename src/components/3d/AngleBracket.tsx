import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { getPartMaterial } from '../../utils/materials';
import { SelectedHoleIndicator } from './SelectedHoleIndicator';
import { HOLE_SPACING, STRIP_WIDTH, HOLE_RADIUS, THICKNESS } from '../../utils/constants';

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

export function AngleBracket({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#bdc3c7', id, selectedHoleIndex, onHoleClick, isSelected, onPartClick }: AngleBracketProps) {
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
                    <meshStandardMaterial {...getPartMaterial(color, isSelected)} />
                </mesh>

                {/* Flange 2 (Upright) */}
                <mesh
                    position={[HOLE_SPACING / 2, 0, HOLE_SPACING / 2]}
                    rotation={[0, -Math.PI / 2, Math.PI]}
                    castShadow
                    receiveShadow
                >
                    <extrudeGeometry args={[shape1, config]} />
                    <meshStandardMaterial {...getPartMaterial(color, isSelected)} />
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
                    <SelectedHoleIndicator holeRadius={HOLE_RADIUS} partThickness={THICKNESS} />
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
                    <SelectedHoleIndicator holeRadius={HOLE_RADIUS} partThickness={THICKNESS} />
                </group>
            )}
        </group>
    );
}
