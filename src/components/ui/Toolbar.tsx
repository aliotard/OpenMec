import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';

export function Toolbar() {
    // Toolbar component for adding parts
    const addPart = useStore((state) => state.addPart);
    const [length, setLength] = useState(5);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const handleAddStrip = () => {
        addPart('strip', {
            length,
            position: [Math.random() * 5 - 2.5, 0, Math.random() * 5 - 2.5],
            rotation: [Math.PI / 2, 0, 0] // Lay flat
        });
    };

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <label htmlFor="length">Holes:</label>
                <input
                    id="length"
                    type="number"
                    min={3}
                    max={25}
                    value={length}
                    onChange={(e) => setLength(Math.max(3, Math.min(25, parseInt(e.target.value) || 3)))}
                    className="toolbar-input"
                />
            </div>

            <button
                onClick={handleAddStrip}
                className="btn btn-primary"
            >
                Add Strip
            </button>

            <div className="separator" />

            <button
                onClick={() => dialogRef.current?.showModal()}
                className="btn btn-danger"
            >
                Clear
            </button>

            <dialog ref={dialogRef} className="dialog">
                <h3 className="dialog-title">Clear Scene?</h3>
                <p>Are you sure you want to remove all parts?</p>
                <div className="dialog-actions">
                    <button
                        onClick={() => dialogRef.current?.close()}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            useStore.getState().clearAll();
                            dialogRef.current?.close();
                        }}
                        className="btn btn-danger"
                    >
                        Confirm
                    </button>
                </div>
            </dialog>
        </div>
    );
}
