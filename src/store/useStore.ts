import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

export type PartType = 'strip' | 'screw' | 'nut' | 'corner-bracket' | 'angle-bracket';

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
    if (type === 'angle-bracket') {
        if (index === 0) return new THREE.Vector3(0, 0, 0);
        if (index === 1) return new THREE.Vector3(HOLE_SPACING / 2, 0, HOLE_SPACING / 2);
    }
    return new THREE.Vector3(index * HOLE_SPACING, 0, 0);
};

const getHoleRotation = (type: PartType, index: number) => {
    if (type === 'angle-bracket' && index === 1) {
        // Hole 1 is on the vertical flange (Normal X)
        // We want to rotate the attached part so its Z axis aligns with X axis.
        // Rotation [0, PI/2, 0] does this (Z -> X).
        return new THREE.Euler(0, Math.PI / 2, 0);
    }
    return new THREE.Euler(0, 0, 0);
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

                // Determine offset distance based on the OTHER part's type and hole
                // If the other part is an Angle Bracket and we are attached to Hole 1 (Upright), offset is 0.
                const isOtherBracketUpright = otherPart.type === 'angle-bracket' && otherHoleIndex === 1;
                const offsetDist = isOtherBracketUpright ? 0 : THICKNESS;

                if (isChild) {
                    // We are B, Other is A
                    // StackOffset depends on A (Other)
                    const otherRot = new THREE.Euler(...otherPart.rotation);
                    const otherQuat = new THREE.Quaternion().setFromEuler(otherRot);
                    const stackOffset = new THREE.Vector3(0, 0, -offsetDist);
                    stackOffset.applyQuaternion(otherQuat);

                    newPos = pivotPos.clone().add(stackOffset).sub(myHoleOffset);
                } else {
                    // We are A, Other is B
                    // StackOffset depends on A (Us, New Rotation)
                    const stackOffset = new THREE.Vector3(0, 0, -offsetDist);
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

                const THICKNESS = 1;

                // Check connectivity
                const isAnchored = (pid: string) => joints.some(j => j.partA === pid || j.partB === pid);
                const anchoredA = isAnchored(partA.id);
                const anchoredB = isAnchored(partB.id);

                // Rule 1: If A is free and B is anchored, move A to B.
                // Otherwise (A anchored/B free, or both free, or both anchored), move B to A (default).
                let moveA = !anchoredA && anchoredB;

                // Heuristic: If both are free (or both anchored), prefer moving the "Strip" to the "Bracket"
                // so the Bracket stays as the "base".
                if (anchoredA === anchoredB) {
                    if (partA.type === 'strip' && partB.type !== 'strip') {
                        moveA = true;
                    } else if (partA.type !== 'strip' && partB.type === 'strip') {
                        moveA = false;
                    }
                }

                // Helper to get world position of a hole
                const getHoleWorldPos = (part: Part, hIndex: number) => {
                    const partPos = new THREE.Vector3(...part.position);
                    const partRot = new THREE.Euler(...part.rotation);
                    const partQuat = new THREE.Quaternion().setFromEuler(partRot);
                    const holeOffset = getHoleOffset(part.type, hIndex);
                    holeOffset.applyQuaternion(partQuat);
                    return partPos.add(holeOffset);
                };

                let interfacePos: THREE.Vector3;
                let finalPartAQuat: THREE.Quaternion;

                if (moveA) {
                    // Move Part A to Part B
                    // Target: Hole B on Part B
                    const posB = getHoleWorldPos(partB, holeIndex);

                    // Determine Stack Offset based on Target (Part B)
                    // If Target is Angle Bracket Upright (Hole 1), it's on the "Top" surface, so no offset needed.
                    // Otherwise (Strip, etc.), hole is on "Bottom", so we need to offset A by Thickness to stack on top.
                    const isTargetBracketUpright = partB.type === 'angle-bracket' && holeIndex === 1;
                    const offsetDist = isTargetBracketUpright ? 0 : THICKNESS;

                    // Calculate new rotation for Part A to align with Part B's hole
                    const holeBRot = getHoleRotation(partB.type, holeIndex);
                    const partBRotEuler = new THREE.Euler(...partB.rotation);
                    const partBQuat = new THREE.Quaternion().setFromEuler(partBRotEuler);
                    const holeBQuat = new THREE.Quaternion().setFromEuler(holeBRot);

                    // Target Orientation = PartB_Rot * HoleB_Rot
                    const targetQuat = partBQuat.clone().multiply(holeBQuat);

                    // We need A * HoleA = Target
                    // A = Target * Inverse(HoleA)
                    const holeARot = getHoleRotation(partA.type, selectedHole.holeIndex);
                    const holeAQuat = new THREE.Quaternion().setFromEuler(holeARot);
                    const holeAInv = holeAQuat.clone().invert();

                    const newPartAQuat = targetQuat.clone().multiply(holeAInv);
                    const targetEuler = new THREE.Euler().setFromQuaternion(newPartAQuat);

                    finalPartAQuat = newPartAQuat;

                    // Calculate offsets with NEW rotation
                    const stackOffset = new THREE.Vector3(0, 0, -offsetDist);
                    stackOffset.applyQuaternion(finalPartAQuat);

                    const holeAOffset = getHoleOffset(partA.type, selectedHole.holeIndex);
                    holeAOffset.applyQuaternion(finalPartAQuat);

                    // newPosA = posB - stackOffset (to move up) - holeAOffset (to center hole)
                    // Note: stackOffset is (0,0,-Thick). Substracting it adds (0,0,Thick).
                    const newPosA = posB.clone().sub(stackOffset).sub(holeAOffset);

                    updatePart(partA.id, {
                        position: [newPosA.x, newPosA.y, newPosA.z],
                        rotation: [targetEuler.x, targetEuler.y, targetEuler.z]
                    });

                    // Interface position is where the holes meet.
                    // Since we moved A, HoleA is now at the interface.
                    // But we need to be careful: if offsetDist was 0, HoleA is at posB.
                    // If offsetDist was 1, HoleA is at posB + 1.
                    // Wait, if offsetDist is 1 (Standard), we moved A up by 1.
                    // So HoleA is at posB + 1.
                    // But posB is at Z=0 (Bottom of B).
                    // HoleA is at Z=1 (Bottom of A).
                    // So Interface is at Z=1.
                    // So InterfacePos = HoleA world pos.
                    const newPartA = { ...partA, position: [newPosA.x, newPosA.y, newPosA.z] as [number, number, number], rotation: [targetEuler.x, targetEuler.y, targetEuler.z] as [number, number, number] };
                    interfacePos = getHoleWorldPos(newPartA, selectedHole.holeIndex);

                } else {
                    // Move Part B to Part A (Default)
                    const posA = getHoleWorldPos(partA, selectedHole.holeIndex);

                    // Target: Part A
                    const isTargetBracketUpright = partA.type === 'angle-bracket' && selectedHole.holeIndex === 1;
                    const offsetDist = isTargetBracketUpright ? 0 : THICKNESS;

                    // Calculate new rotation for Part B to align with Part A's hole
                    const holeARot = getHoleRotation(partA.type, selectedHole.holeIndex);
                    const holeAQuat = new THREE.Quaternion().setFromEuler(holeARot);
                    // Target Orientation = PartA_Rot * HoleA_Rot
                    const partAQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partA.rotation));
                    const targetQuat = partAQuat.clone().multiply(holeAQuat);

                    finalPartAQuat = partAQuat; // A defines the orientation

                    const holeBRot = getHoleRotation(partB.type, holeIndex);
                    const holeBQuat = new THREE.Quaternion().setFromEuler(holeBRot);
                    const holeBInv = holeBQuat.clone().invert();

                    const newPartBQuat = targetQuat.clone().multiply(holeBInv);
                    const newPartBEuler = new THREE.Euler().setFromQuaternion(newPartBQuat);

                    // Re-calculate offsets with NEW rotation
                    const partBQuatNew = newPartBQuat;
                    const holeBOffset = getHoleOffset(partB.type, holeIndex);
                    holeBOffset.applyQuaternion(partBQuatNew);

                    // Stack Offset depends on A (Anchor).
                    // We move B relative to A.
                    // If A is Strip (Bottom Hole), we move B to -1 (Under).
                    // If A is Bracket (Top Hole), we move B to 0 (Surface).
                    // stackOffset vector should be (0,0,-offsetDist) relative to A's orientation?
                    // No, relative to the Hole Normal (which is A's Z axis).
                    // So we use partAQuat? No, we use targetQuat (which is aligned with Hole Normal).
                    // Actually, stackOffset is applied to position B.
                    // We want B to be at posA + (0,0,-offset).
                    // So we construct vector (0,0,-offset) and rotate by targetQuat.
                    const stackOffset = new THREE.Vector3(0, 0, -offsetDist);
                    stackOffset.applyQuaternion(targetQuat);

                    const newPosB = posA.clone().add(stackOffset).sub(holeBOffset);

                    updatePart(partB.id, {
                        position: [newPosB.x, newPosB.y, newPosB.z],
                        rotation: [newPartBEuler.x, newPartBEuler.y, newPartBEuler.z]
                    });

                    // Interface position.
                    // If offset was 1 (Standard), B is at -1. HoleB is at -1.
                    // posA is at 0.
                    // Interface is at 0 (posA).
                    // If offset was 0 (Bracket), B is at 0. HoleB is at 0.
                    // posA is at 0.
                    // Interface is at 0.
                    // So InterfacePos is always posA.
                    interfacePos = posA;
                }

                // Screw and Nut placement
                // We define the "Stack Direction" as the Normal of the interface (Hole Axis).
                // Screw Head is at Interface - Thickness (Bottom).
                // Nut is at Interface + Thickness (Top).
                // Note: This assumes standard 2-layer assembly.

                const holeARot = getHoleRotation(partA.type, selectedHole.holeIndex);
                const holeAQuat = new THREE.Quaternion().setFromEuler(holeARot);
                // We need the orientation of the hole axis in world space.
                // If we moved A, finalPartAQuat is A's new rotation.
                // If we moved B, finalPartAQuat is A's rotation (A didn't move).
                // So finalPartAQuat * holeAQuat gives the Hole Axis orientation.
                const axisQuat = finalPartAQuat.clone().multiply(holeAQuat);
                const axisEuler = new THREE.Euler().setFromQuaternion(axisQuat);

                // Normal vector (Z axis of the hole)
                const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(axisQuat);

                // Screw Pos: Interface - 1 * Normal
                const screwPos = interfacePos.clone().sub(normal.clone().multiplyScalar(THICKNESS));

                // Nut Pos: Interface + 1 * Normal
                const nutPos = interfacePos.clone().add(normal.clone().multiplyScalar(THICKNESS));

                addPart('screw', {
                    position: [screwPos.x, screwPos.y, screwPos.z],
                    rotation: [axisEuler.x, axisEuler.y, axisEuler.z]
                });

                addPart('nut', {
                    position: [nutPos.x, nutPos.y, nutPos.z],
                    rotation: [axisEuler.x, axisEuler.y, axisEuler.z]
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
