# OpenMec

OpenMec is a web-based 3D construction application inspired by Meccano. It allows users to build models using perforated strips, screws, and nuts in an interactive 3D environment.

## Features

*   **Procedural Parts**: Generate perforated strips of variable lengths (3 to 25 holes).
*   **Interactive Assembly**:
    *   Click on holes to align and assemble strips.
    *   Automatic placement of screws and nuts (screw on top, nut on bottom).
    *   Correct stacking of parts (strips stack on top of each other).
*   **Selection & Manipulation**:
    *   Click on parts to select them (visual feedback).
    *   Rotate selected parts around their pivot point (screw axis).
*   **3D Visualization**:
    *   Built with `three.js` and `@react-three/fiber`.
    *   Realistic rendering with shadows and materials.
    *   Orbit controls for navigating the scene.

## Tech Stack

*   **Framework**: React, Vite, TypeScript
*   **3D Engine**: Three.js, @react-three/fiber, @react-three/drei
*   **State Management**: Zustand
*   **Styling**: CSS (BEM naming convention)

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

3.  **Open the application**:
    Navigate to `http://localhost:5173` in your browser.

## Usage

1.  **Add a Strip**: Use the toolbar at the bottom to specify the number of holes and click "Add Strip".
2.  **Assemble**: Click on a hole in one strip, then click on a hole in another strip to join them.
3.  **Select**: Click on a strip to select it (it will glow orange).
4.  **Rotate**: Use the buttons in the top-right properties panel to rotate the selected strip.
5.  **Clear**: Click the "Clear" button in the toolbar to remove all parts (requires confirmation).

## License

MIT
