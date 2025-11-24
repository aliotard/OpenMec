import { useStore } from '../../store/useStore';
import { Strip } from './Strip';
import { CornerBracket } from './CornerBracket';
import { Screw, Nut } from './Parts';
import { OrbitControls, Environment, Grid } from '@react-three/drei';

export function Scene() {
    const parts = useStore((state) => state.parts);
    const selectHole = useStore((state) => state.selectHole);
    const selectedHole = useStore((state) => state.selectedHole);
    const selectPart = useStore((state) => state.selectPart);
    const selectedPartId = useStore((state) => state.selectedPartId);

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <Environment preset="city" />

            <Grid infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" />
            <OrbitControls makeDefault />

            {parts.map((part) => {
                const isSelected = selectedHole?.partId === part.id;

                if (part.type === 'strip') {
                    return (
                        <Strip
                            key={part.id}
                            id={part.id}
                            length={part.length || 5}
                            position={part.position}
                            rotation={part.rotation}
                            color={part.color}
                            selectedHoleIndex={isSelected ? selectedHole?.holeIndex : null}
                            onHoleClick={(_, holeIndex) => selectHole(part.id, holeIndex)}
                            isSelected={selectedPartId === part.id}
                            onPartClick={() => selectPart(part.id)}
                        />
                    );
                }
                if (part.type === 'corner-bracket') {
                    return (
                        <CornerBracket
                            key={part.id}
                            id={part.id}
                            position={part.position}
                            rotation={part.rotation}
                            color={part.color}
                            selectedHoleIndex={isSelected ? selectedHole?.holeIndex : null}
                            onHoleClick={(_, holeIndex) => selectHole(part.id, holeIndex)}
                            isSelected={selectedPartId === part.id}
                            onPartClick={() => selectPart(part.id)}
                        />
                    );
                }
                if (part.type === 'screw') {
                    return (
                        <Screw
                            key={part.id}
                            position={part.position}
                            rotation={part.rotation}
                            color={part.color}
                            isSelected={selectedPartId === part.id}
                            onClick={() => selectPart(part.id)}
                        />
                    );
                }
                if (part.type === 'nut') {
                    return (
                        <Nut
                            key={part.id}
                            position={part.position}
                            rotation={part.rotation}
                            color={part.color}
                            isSelected={selectedPartId === part.id}
                            onClick={() => selectPart(part.id)}
                        />
                    );
                }
                return null;
            })}
        </>
    );
}
