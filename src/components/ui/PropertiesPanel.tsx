import { useStore } from '../../store/useStore';

export function PropertiesPanel() {
    const selectedPartId = useStore((state) => state.selectedPartId);
    const parts = useStore((state) => state.parts);
    const rotatePart = useStore((state) => state.rotatePart);

    const selectedPart = parts.find((p) => p.id === selectedPartId);

    if (!selectedPart) return null;

    const rotate = (delta: number) => {
        rotatePart(selectedPart.id, delta * (Math.PI / 180)); // Convert deg to rad
    };

    return (
        <div className="properties-panel">
            <h3 className="panel-title">Properties</h3>
            <div className="panel-section">
                <strong>Type:</strong> {selectedPart.type}
            </div>

            {selectedPart.type === 'strip' && (
                <div>
                    <div className="panel-label">Rotation</div>
                    <div className="rotation-controls">
                        <button onClick={() => rotate(-5)} className="btn-small">-5°</button>
                        <button onClick={() => rotate(-45)} className="btn-small">-45°</button>
                        <button onClick={() => rotate(45)} className="btn-small">+45°</button>
                        <button onClick={() => rotate(5)} className="btn-small">+5°</button>
                    </div>
                </div>
            )}

            <div className="panel-footer">
                ID: {selectedPart.id.slice(0, 8)}...
            </div>
        </div>
    );
}
