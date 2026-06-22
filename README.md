<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/favicon-white.png">
    <source media="(prefers-color-scheme: light)" srcset="public/favicon-black.png">
    <img src="public/favicon-black.png" width="80" alt="Planar logo" />
  </picture>
</p>
<h1 align="center">Planar</h1>

**Scale, crop, and tile images onto sheets of paper for easy printing.**

Planar is a modern, lightweight, serverless browser utility built for designers, paper-crafters, and creators. It allows you to arrange, calibrate, crop, scale, and tile images across multiple physical print pages locally on your device.

🔗 **Live Website**: [planar.masn.studio](https://planar.masn.studio)

---

## Preview

https://github.com/user-attachments/assets/41deb988-3840-4da3-82e3-af5fdd5678f4

| | |
|:---:|:---:|
| ![Upload and arrange images on a print canvas](Demo/Demo%20Material/1.png) | ![Scale and tile images across poster grid sheets](Demo/Demo%20Material/2.png) |
| ![Calibrate physical dimensions with two-point ruler tool](Demo/Demo%20Material/3.png) | ![Multi-page tiled print layout with assembly guides](Demo/Demo%20Material/4.png) |

---

## Features

*   **Real-World Physical Calibration**: Calibrate exact real-world dimensions (mm, cm, in) by selecting two points on your image and entering their actual measurement.
*   **Intuitive Direct Cropping**: Crop images by dragging borders and handles directly on the canvas preview, complete with real-time guides, an uncropped dimmed background, and a canvas-level cancellation history.
*   **Tiled Grid & Poster Layouts**: Split and tile large images dynamically across multi-page print sheets. The grid automatically manages layout dimensions.
*   **Grid Expansion Tool**: Add rows or columns to the canvas paper sheets with one-click `+` buttons on the pasteboard, or remove sheets on hover.
*   **Snapping Rotation Tool**: Rotate images on the canvas, or use the sidebar rotation slider and buttons that snap strongly to 45° increments.
*   **Drag-and-Drop URL Imports**: Drag images directly from local folders or other browser tabs over the canvas to import them instantly.
*   **Local Background Removal (RemBG)**: Remove backgrounds locally in your browser using high-performance, client-side ONNX Runtime WebAssembly models. All processing is 100% private.
*   **Smooth Gesture Canvas**: Premium canvas workspace supporting trackpad pinching/zooming, physical mouse wheel zoom, middle-click panning, Space + drag, and mobile touch gestures.
*   **Modern Minimalism**: Polished dark and light modes, zero bloat, and elegant micro-interactions.

---

## Getting Started

### Prerequisites

Make sure you have **Node.js** installed on your system.

### Installation & Run

1. Clone this repository:
   ```bash
   git clone https://github.com/Mason363/Planar.git
   cd Planar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

---

## Stack

*   **Framework**: Next.js (React 19)
*   **Language**: TypeScript
*   **Styling**: Pure Vanilla CSS (custom variables, responsive layout system)
*   **WASM Engine**: `@imgly/background-removal` for local background removal
*   **Icons**: Lucide React & inline SVGs

---

## Privacy First

Planar is fully serverless. All image scaling, cropping, background removal, and layout calculation happen strictly in your browser's local memory. No data or image files are uploaded to any external server.

Made with ❤️ by Mason Chen
