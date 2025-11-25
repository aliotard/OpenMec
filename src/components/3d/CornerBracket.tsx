import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { getPartMaterial } from '../../utils/materials';
import { SelectedHoleIndicator } from './SelectedHoleIndicator';
import { HOLE_SPACING, STRIP_WIDTH, HOLE_RADIUS, THICKNESS } from '../../utils/constants';

interface CornerBracketProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    id: string;
    selectedHoleIndex?: number | null;
    onHoleClick?: (e: ThreeEvent<MouseEvent>, holeIndex: number) => void;
    isSelected?: boolean;
    onPartClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const HOLE_POSITIONS = [
    [0, 0, 0],
    [HOLE_SPACING, 0, 0],
    [0, HOLE_SPACING, 0]
];

export function CornerBracket({ position = [0, 0, 0], rotation = [0, 0, 0], color = '#bdc3c7', id, selectedHoleIndex, onHoleClick, isSelected, onPartClick }: CornerBracketProps) {
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        const radius = STRIP_WIDTH / 2;

        // L-Shape contour
        // Start at bottom of central hole
        s.absarc(0, 0, radius, Math.PI, Math.PI * 1.5); // Corner arc (bottom-left)
        s.lineTo(HOLE_SPACING, -radius); // Bottom edge
        s.absarc(HOLE_SPACING, 0, radius, -Math.PI / 2, Math.PI / 2); // Right tip arc
        s.lineTo(radius, radius); // Inner corner horizontal
        s.lineTo(radius, HOLE_SPACING); // Inner corner vertical
        s.absarc(0, HOLE_SPACING, radius, 0, Math.PI); // Top tip arc
        s.lineTo(-radius, 0); // Left edge

        // Holes
        HOLE_POSITIONS.forEach(pos => {
            const hole = new THREE.Path();
            hole.absarc(pos[0], pos[1], HOLE_RADIUS, 0, Math.PI * 2, true);
            s.holes.push(hole);
        });

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
            <mesh onClick={handleClick} castShadow receiveShadow>
                <extrudeGeometry args={[shape, config]} />
                <meshStandardMaterial {...getPartMaterial(color, isSelected)} />
            </mesh>

            {/* Invisible Hitboxes for Holes */}
            {HOLE_POSITIONS.map((pos, i) => (
                <mesh
                    key={i}
                    position={[pos[0], pos[1], THICKNESS / 2]}
                    rotation={[Math.PI / 2, 0, 0]}
                    onClick={(e) => handleHoleClick(e, i)}
                >
                    <cylinderGeometry args={[HOLE_RADIUS, HOLE_RADIUS, THICKNESS + 0.2, 16]} />
                    <meshBasicMaterial color="red" transparent opacity={0} />
                </mesh>
            ))}

            {/* Selected Hole Indicator */}
            {selectedHoleIndex !== undefined && selectedHoleIndex !== null && HOLE_POSITIONS[selectedHoleIndex] && (
                <group position={[HOLE_POSITIONS[selectedHoleIndex][0], HOLE_POSITIONS[selectedHoleIndex][1], 0]}>
                    <SelectedHoleIndicator holeRadius={HOLE_RADIUS} partThickness={THICKNESS} />
                </group>
            )}
        </group>
    );
}
