import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

export type PartType = 'strip' | 'screw' | 'nut';

export interface Part {
    id: string;
    type: PartType;
    length?: number; // For strips
    position: [number, number, number];
    rotation: [number, number, number];
    color?: string;
    parentId?: string; // For hierarchy/assembly
}

export interface Joint {
    id: string;
    partA: string; // The parent part (e.g. strip)
    holeA: number; // Index of hole on partA
    partB: string; // The child part (e.g. another strip or screw)
    holeB?: number; // Index of hole on partB (if applicable)
}

interface StoreState {
    parts: Part[];
    joints: Joint[];
    selectedPartId: string | null;
    selectedHole: { partId: string; holeIndex: number } | null;

    addPart: (type: PartType, props?: Partial<Part>) => void;
    updatePart: (id: string, updates: Partial<Part>) => void;
    rotatePart: (id: string, angleDelta: number) => void;
    selectPart: (id: string | null) => void;
    selectHole: (partId: string, holeIndex: number) => void;
    resetSelection: () => void;
    clearAll: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
    parts: [],
    joints: [],
    selectedPartId: null,
    selectedHole: null,

    addPart: (type, props = {}) => {
        const newPart: Part = {
            id: uuidv4(),
            type,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            ...props,
        };
        set((state) => ({ parts: [...state.parts, newPart] }));
    },

    updatePart: (id, updates) => {
        set((state) => ({
            parts: state.parts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
    },

    selectPart: (id) => set({ selectedPartId: id }),

    rotatePart: (id, angleDelta) => {
        const { parts, joints, updatePart } = get();
        const part = parts.find((p) => p.id === id);
        if (!part) return;

        // Update rotation (Z axis for 2D strip pivoting)
        const newRotation: [number, number, number] = [
            part.rotation[0],
            part.rotation[1],
            part.rotation[2] + angleDelta
        ];

        // Check if this part is attached to another (is partB in a joint)
        const joint = joints.find((j) => j.partB === id);

        if (joint) {
            // Re-calculate position to satisfy constraint
            const partA = parts.find((p) => p.id === joint.partA);
            if (partA) {
                const HOLE_SPACING = 12.7;
                const THICKNESS = 1;

                // Helper to get world position of a hole
                const getHoleWorldPos = (p: Part, hIndex: number) => {
                    const pPos = new THREE.Vector3(...p.position);
                    const pRot = new THREE.Euler(...p.rotation);
                    const pQuat = new THREE.Quaternion().setFromEuler(pRot);
                    const hOffset = new THREE.Vector3(hIndex * HOLE_SPACING, 0, 0);
                    hOffset.applyQuaternion(pQuat);
                    return pPos.add(hOffset);
                };

                const pivotPos = getHoleWorldPos(partA, joint.holeA);

                // Calculate offset of holeB in partB's new orientation
                const partBRot = new THREE.Euler(...newRotation);
                const partBQuat = new THREE.Quaternion().setFromEuler(partBRot);
                const holeBOffset = new THREE.Vector3(joint.holeB! * HOLE_SPACING, 0, 0);
                holeBOffset.applyQuaternion(partBQuat);

                // Calculate stack offset (must match assembly logic)
                // In selectHole: stackOffset = (0, 0, -THICKNESS) rotated by partA
                const partAQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partA.rotation));
                const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                stackOffset.applyQuaternion(partAQuat);

                const newPos = pivotPos.clone().add(stackOffset).sub(holeBOffset);

                updatePart(id, {
                    rotation: newRotation,
                    position: [newPos.x, newPos.y, newPos.z]
                });
                return;
            }
        }

        // If no joint, just rotate in place (around origin)
        updatePart(id, { rotation: newRotation });
    },

    selectHole: (partId, holeIndex) => {
        const { selectedHole, parts, addPart, updatePart } = get();

        // If clicking the same hole, deselect
        if (selectedHole?.partId === partId && selectedHole.holeIndex === holeIndex) {
            set({ selectedHole: null });
            return;
        }

        // If we already have one hole selected, and this is a different part, assemble!
        if (selectedHole && selectedHole.partId !== partId) {
            const partA = parts.find(p => p.id === selectedHole.partId);
            const partB = parts.find(p => p.id === partId);

            if (partA && partB) {
                console.log('Assembling', partA.id, selectedHole.holeIndex, 'to', partB.id, holeIndex);

                const HOLE_SPACING = 12.7;

                // Helper to get world position of a hole
                const getHoleWorldPos = (part: Part, holeIndex: number) => {
                    const partPos = new THREE.Vector3(...part.position);
                    const partRot = new THREE.Euler(...part.rotation);
                    const partQuat = new THREE.Quaternion().setFromEuler(partRot);

                    const holeOffset = new THREE.Vector3(holeIndex * HOLE_SPACING, 0, 0);
                    holeOffset.applyQuaternion(partQuat);

                    return partPos.add(holeOffset);
                };

                const posA = getHoleWorldPos(partA, selectedHole.holeIndex);

                // Move Part B
                // New Pos B = Pos A - (Hole B offset rotated by Part B rotation)
                const partBRot = new THREE.Euler(...partB.rotation);
                const partBQuat = new THREE.Quaternion().setFromEuler(partBRot);
                const holeBOffset = new THREE.Vector3(holeIndex * HOLE_SPACING, 0, 0);
                holeBOffset.applyQuaternion(partBQuat);

                // Calculate stack offset (move Part B on top of Part A)
                // We want Part B to be at Local Z = -THICKNESS (so it sits on top of Part A which is at 0)
                const THICKNESS = 1;
                const partAQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partA.rotation));
                const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                stackOffset.applyQuaternion(partAQuat);

                // Move Part B on top of Part A
                const newPosB = posA.clone().add(stackOffset).sub(holeBOffset);

                updatePart(partB.id, {
                    position: [newPosB.x, newPosB.y, newPosB.z]
                });

                // Screw on top of Part B (at stackOffset)
                const screwPos = posA.clone().add(stackOffset);
                addPart('screw', {
                    position: [screwPos.x, screwPos.y, screwPos.z],
                    rotation: partA.rotation
                });

                // Nut at bottom of Part A (at +THICKNESS)
                const nutOffset = new THREE.Vector3(0, 0, THICKNESS);
                nutOffset.applyQuaternion(partAQuat);
                const nutPos = posA.clone().add(nutOffset);

                addPart('nut', {
                    position: [nutPos.x, nutPos.y, nutPos.z],
                    rotation: partA.rotation
                });

                // Create Joint
                const newJoint: Joint = {
                    id: uuidv4(),
                    partA: partA.id,
                    holeA: selectedHole.holeIndex,
                    partB: partB.id,
                    holeB: holeIndex
                };
                set((state) => ({ joints: [...state.joints, newJoint] }));

                // Select the attached part so we can rotate it immediately
                set({ selectedPartId: partB.id });

            }

            set({ selectedHole: null }); // Reset selection after attempt
        } else {
            set({ selectedHole: { partId, holeIndex } });
            console.log(`Selected hole ${holeIndex} on part ${partId}`);
        }
    },

    resetSelection: () => set({ selectedPartId: null, selectedHole: null }),

    clearAll: () => set({ parts: [], joints: [], selectedPartId: null, selectedHole: null }),
}));
