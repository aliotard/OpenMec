import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

export type PartType = 'strip' | 'screw' | 'nut' | 'corner-bracket';

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

const getHoleOffset = (type: PartType, index: number) => {
    const HOLE_SPACING = 12.7;
    if (type === 'corner-bracket') {
        if (index === 0) return new THREE.Vector3(0, 0, 0);
        if (index === 1) return new THREE.Vector3(HOLE_SPACING, 0, 0);
        if (index === 2) return new THREE.Vector3(0, HOLE_SPACING, 0);
    }
    return new THREE.Vector3(index * HOLE_SPACING, 0, 0);
};

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
    removePart: (id: string) => void;
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

        // Rule 2: If a part is fixed to 2 other parts, it cannot be rotated
        const connectedJoints = joints.filter((j) => j.partA === id || j.partB === id);
        if (connectedJoints.length >= 2) {
            return;
        }

        const part = parts.find((p) => p.id === id);
        if (!part) return;

        // Update rotation (Z axis for 2D strip pivoting)
        const newRotation: [number, number, number] = [
            part.rotation[0],
            part.rotation[1],
            part.rotation[2] + angleDelta
        ];

        // Check if this part is attached to another
        const joint = connectedJoints[0]; // We know there's at most 1 because of the check above

        if (joint) {
            const isChild = joint.partB === id;
            const otherPartId = isChild ? joint.partA : joint.partB;
            const otherPart = parts.find((p) => p.id === otherPartId);

            if (otherPart) {
                const HOLE_SPACING = 12.7;
                const THICKNESS = 1;

                // Helper to get world position of a hole
                const getHoleWorldPos = (p: Part, hIndex: number) => {
                    const pPos = new THREE.Vector3(...p.position);
                    const pRot = new THREE.Euler(...p.rotation);
                    const pQuat = new THREE.Quaternion().setFromEuler(pRot);
                    const hOffset = getHoleOffset(p.type, hIndex);
                    hOffset.applyQuaternion(pQuat);
                    return pPos.add(hOffset);
                };

                // Determine Pivot Point (The hole on the OTHER part)
                const otherHoleIndex = isChild ? joint.holeA : joint.holeB!;
                const pivotPos = getHoleWorldPos(otherPart, otherHoleIndex);

                // Calculate offset of OUR hole in OUR new orientation
                const myHoleIndex = isChild ? joint.holeB! : joint.holeA;
                const myRot = new THREE.Euler(...newRotation);
                const myQuat = new THREE.Quaternion().setFromEuler(myRot);
                const myHoleOffset = getHoleOffset(part.type, myHoleIndex);
                myHoleOffset.applyQuaternion(myQuat);

                let newPos: THREE.Vector3;

                if (isChild) {
                    // We are B, Other is A
                    // StackOffset depends on A (Other)
                    const otherRot = new THREE.Euler(...otherPart.rotation);
                    const otherQuat = new THREE.Quaternion().setFromEuler(otherRot);
                    const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                    stackOffset.applyQuaternion(otherQuat);

                    newPos = pivotPos.clone().add(stackOffset).sub(myHoleOffset);
                } else {
                    // We are A, Other is B
                    // StackOffset depends on A (Us, New Rotation)
                    const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                    stackOffset.applyQuaternion(myQuat);

                    newPos = pivotPos.clone().sub(stackOffset).sub(myHoleOffset);
                }

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
        const { selectedHole, parts, joints, addPart, updatePart } = get();

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
                const THICKNESS = 1;

                // Check connectivity
                const isAnchored = (pid: string) => joints.some(j => j.partA === pid || j.partB === pid);
                const anchoredA = isAnchored(partA.id);
                const anchoredB = isAnchored(partB.id);

                // Rule 1: If A is free and B is anchored, move A to B.
                // Otherwise (A anchored/B free, or both free, or both anchored), move B to A (default).
                const moveA = !anchoredA && anchoredB;

                // Helper to get world position of a hole
                const getHoleWorldPos = (part: Part, hIndex: number) => {
                    const partPos = new THREE.Vector3(...part.position);
                    const partRot = new THREE.Euler(...part.rotation);
                    const partQuat = new THREE.Quaternion().setFromEuler(partRot);
                    const holeOffset = getHoleOffset(part.type, hIndex);
                    holeOffset.applyQuaternion(partQuat);
                    return partPos.add(holeOffset);
                };

                let connectionPoint: THREE.Vector3;
                let partAQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partA.rotation));

                if (moveA) {
                    // Move Part A to Part B
                    // Target: Hole B on Part B
                    const posB = getHoleWorldPos(partB, holeIndex);

                    // We want A to be "above" B (B at -Thickness of A).
                    // So PosB = PosA + RotA*HoleA + RotA*(0,0,-1)
                    // PosA = PosB - RotA*(0,0,-1) - RotA*HoleA

                    const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                    stackOffset.applyQuaternion(partAQuat);

                    const holeAOffset = getHoleOffset(partA.type, selectedHole.holeIndex);
                    holeAOffset.applyQuaternion(partAQuat);

                    const newPosA = posB.clone().sub(stackOffset).sub(holeAOffset);

                    updatePart(partA.id, {
                        position: [newPosA.x, newPosA.y, newPosA.z]
                    });

                    // Connection point for screw/nut is the hole location (which is now aligned)
                    // We can use posB as the reference since A is moved to match it (offset by stack)
                    // Screw is on top of A.
                    // PosB is at "bottom" of A (well, -Thickness).
                    // Wait, B is at -Thickness relative to A.
                    // So A is at Z=0, B is at Z=-1.
                    // Screw head is at Z=0 (on top of A).
                    // Nut is at Z=+1 (below A? No wait).
                    // Let's re-verify stack logic.
                    // Previous logic: ScrewPos = PosA + StackOffset.
                    // StackOffset = (0,0,-1).
                    // So Screw is at -1? That seems wrong if Screw is "on top".
                    // Let's check Screw geometry.
                    // Head: [0,0,-1]. Shaft: [0,0,5].
                    // If Screw is at 0, Head is at -1.
                    // If A is at 0.
                    // We want Head ON TOP of A.
                    // If A extrudes 0..1 (or 0..-1?).
                    // If B is at -1.
                    // It seems the "StackOffset" variable name might be misleading or I'm misinterpreting.
                    // Let's stick to the code that worked:
                    // ScrewPos = PosA + StackOffset.
                    // NutPos = PosA + NutOffset (0,0,Thickness).

                    // If we moved A, we need to recalculate PosA based on new position
                    // Or simpler: ConnectionPoint is where the screw goes.
                    // In previous code: screwPos = posA.clone().add(stackOffset);
                    // And posA was the OLD posA.
                    // Wait, in previous code A didn't move. So posA was valid.
                    // Here A moved. So we must use NEW PosA.

                    // Let's recalculate PosA world pos
                    const newPartA = { ...partA, position: [newPosA.x, newPosA.y, newPosA.z] as [number, number, number] };
                    const newPosHoleA = getHoleWorldPos(newPartA, selectedHole.holeIndex);

                    connectionPoint = newPosHoleA.clone().add(stackOffset);

                } else {
                    // Move Part B to Part A (Default)
                    const posA = getHoleWorldPos(partA, selectedHole.holeIndex);

                    const partBRot = new THREE.Euler(...partB.rotation);
                    const partBQuat = new THREE.Quaternion().setFromEuler(partBRot);
                    const holeBOffset = getHoleOffset(partB.type, holeIndex);
                    holeBOffset.applyQuaternion(partBQuat);

                    const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                    stackOffset.applyQuaternion(partAQuat);

                    const newPosB = posA.clone().add(stackOffset).sub(holeBOffset);

                    updatePart(partB.id, {
                        position: [newPosB.x, newPosB.y, newPosB.z]
                    });

                    connectionPoint = posA.clone().add(stackOffset);
                }

                // Screw on top of Part B (at stackOffset relative to A) -> Actually this variable is used for Screw Position
                const screwPos = connectionPoint;
                addPart('screw', {
                    position: [screwPos.x, screwPos.y, screwPos.z],
                    rotation: partA.rotation
                });

                // Nut at bottom of Part A (at +THICKNESS)
                const nutOffset = new THREE.Vector3(0, 0, THICKNESS);
                nutOffset.applyQuaternion(partAQuat);

                // We need the hole A position for the nut reference
                // If A moved, we need new hole pos.
                // Actually, connectionPoint = HoleA_Pos + StackOffset(0,0,-1).
                // So HoleA_Pos = connectionPoint - StackOffset.
                // NutPos = HoleA_Pos + NutOffset(0,0,1).
                // NutPos = connectionPoint - (0,0,-1) + (0,0,1) = connectionPoint + (0,0,2).
                // Let's use vectors to be safe.

                const stackOffset = new THREE.Vector3(0, 0, -THICKNESS);
                stackOffset.applyQuaternion(partAQuat);

                const holeAPos = connectionPoint.clone().sub(stackOffset);
                const nutPos = holeAPos.clone().add(nutOffset);

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

                // Select the attached part (or the one that didn't move? Usually we select the one we just clicked or the assembly)
                // Previous behavior: select partB.
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

    removePart: (id: string) => {
        set((state) => {
            // Remove the part
            const newParts = state.parts.filter((p) => p.id !== id);

            // Remove any joints connected to this part
            const newJoints = state.joints.filter((j) => j.partA !== id && j.partB !== id);

            // Reset selection if the removed part was selected
            const newSelectedPartId = state.selectedPartId === id ? null : state.selectedPartId;
            const newSelectedHole = state.selectedHole?.partId === id ? null : state.selectedHole;

            return {
                parts: newParts,
                joints: newJoints,
                selectedPartId: newSelectedPartId,
                selectedHole: newSelectedHole
            };
        });
    },
}));
