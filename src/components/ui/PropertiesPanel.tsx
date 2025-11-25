import { useStore } from '../../store/useStore';

export function PropertiesPanel() {
    const selectedPartId = useStore((state) => state.selectedPartId);
    const parts = useStore((state) => state.parts);
    const rotatePart = useStore((state) => state.rotatePart);
    const joints = useStore((state) => state.joints);

    const selectedPart = parts.find((p) => p.id === selectedPartId);

    if (!selectedPart) return null;

    // Check if part is locked (connected to 2 or more other parts)
    const connectedJoints = joints.filter((j) => j.partA === selectedPartId || j.partB === selectedPartId);
    const isLocked = connectedJoints.length >= 2;

    const rotate = (delta: number) => {
        if (!isLocked) {
            rotatePart(selectedPart.id, delta * (Math.PI / 180)); // Convert deg to rad
        }
    };

    return (
        <div className="properties-panel">
            <h3 className="panel-title">Properties</h3>
            <div className="panel-section">
                <strong>Type:</strong> {selectedPart.type}
            </div>

            {(selectedPart.type === 'strip' || selectedPart.type === 'corner-bracket' || selectedPart.type === 'angle-bracket') && (
                <div>
                    <div className="panel-label">Rotation {isLocked && <span style={{ fontSize: '0.8em', color: '#e74c3c' }}>(Locked)</span>}</div>
                    <div className="rotation-controls">
                        <button onClick={() => rotate(-5)} className="btn-small" disabled={isLocked}>-5°</button>
                        <button onClick={() => rotate(-45)} className="btn-small" disabled={isLocked}>-45°</button>
                        <button onClick={() => rotate(45)} className="btn-small" disabled={isLocked}>+45°</button>
                        <button onClick={() => rotate(5)} className="btn-small" disabled={isLocked}>+5°</button>
                    </div>
                </div>
            )}

            <div className="panel-footer">
                ID: {selectedPart.id.slice(0, 8)}...
            </div>
        </div>
    );
}
