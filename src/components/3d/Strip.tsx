import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { getPartMaterial } from '../../utils/materials';
import { SelectedHoleIndicator } from './SelectedHoleIndicator';
import { HOLE_SPACING, STRIP_WIDTH, HOLE_RADIUS, THICKNESS } from '../../utils/constants';

interface StripProps {
    length: number; // Number of holes
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    id: string;
    selectedHoleIndex?: number | null;
    onHoleClick?: (e: ThreeEvent<MouseEvent>, holeIndex: number) => void;
}

export function Strip({ length, position = [0, 0, 0], rotation = [0, 0, 0], color = '#bdc3c7', id, selectedHoleIndex, onHoleClick, isSelected, onPartClick }: StripProps & { isSelected?: boolean, onPartClick?: (e: ThreeEvent<MouseEvent>) => void }) {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        const totalLength = (length - 1) * HOLE_SPACING;
        const radius = STRIP_WIDTH / 2;

        // Outer shape (rounded rectangle)
        s.absarc(0, 0, radius, Math.PI / 2, Math.PI * 1.5);
        s.absarc(totalLength, 0, radius, -Math.PI / 2, Math.PI / 2);
        s.lineTo(0, radius);

        // Holes
        for (let i = 0; i < length; i++) {
            const hole = new THREE.Path();
            hole.absarc(i * HOLE_SPACING, 0, HOLE_RADIUS, 0, Math.PI * 2, true);
            s.holes.push(hole);
        }

        return s;
    }, [length]);

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
            <mesh onClick={handleClick} castShadow receiveShadow>
                <extrudeGeometry args={[shape, config]} />
                <meshStandardMaterial {...getPartMaterial(color, isSelected)} />
            </mesh>

            {/* Invisible Hitboxes for Holes */}
            {Array.from({ length }).map((_, i) => (
                <mesh
                    key={i}
                    position={[i * HOLE_SPACING, 0, THICKNESS / 2]}
                    rotation={[Math.PI / 2, 0, 0]}
                    onClick={(e) => handleHoleClick(e, i)}
                >
                    <cylinderGeometry args={[HOLE_RADIUS, HOLE_RADIUS, THICKNESS + 0.2, 16]} />
                    <meshBasicMaterial color="red" transparent opacity={0} />
                </mesh>
            ))}

            {/* Selected Hole Indicator */}
            {selectedHoleIndex !== undefined && selectedHoleIndex !== null && (
                <group position={[selectedHoleIndex * HOLE_SPACING, 0, 0]}>
                    <SelectedHoleIndicator holeRadius={HOLE_RADIUS} partThickness={THICKNESS} />
                </group>
            )}
        </group>
    );
}
