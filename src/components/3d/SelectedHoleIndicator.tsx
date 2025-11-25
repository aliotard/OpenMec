import * as THREE from 'three';

interface SelectedHoleIndicatorProps {
    holeRadius?: number;
    partThickness?: number;
}

export function SelectedHoleIndicator({ holeRadius = 4.1 / 2, partThickness = 1 }: SelectedHoleIndicatorProps) {
    return (
        <group>
            {/* Top Ring */}
            <mesh position={[0, 0, partThickness + 0.02]}>
                <ringGeometry args={[holeRadius + 0.8, holeRadius + 1.8, 32]} />
                <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            {/* Bottom Ring */}
            <mesh position={[0, 0, -0.02]}>
                <ringGeometry args={[holeRadius + 0.8, holeRadius + 1.8, 32]} />
                <meshBasicMaterial color="#f1c40f" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}
