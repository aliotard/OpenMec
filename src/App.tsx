import { Canvas } from '@react-three/fiber';
import { Scene } from './components/3d/Scene';
import { Toolbar } from './components/ui/Toolbar';
import { PropertiesPanel } from './components/ui/PropertiesPanel';

function App() {
  return (
    <>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }} shadows>
        <color attach="background" args={['#202020']} />
        <Scene />
      </Canvas>

      <div className="app-title-container">
        <h1 className="app-title">OpenMec</h1>
      </div>

      <Toolbar />
      <PropertiesPanel />
    </>
  );
}

export default App;
