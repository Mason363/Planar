# Planar

Minimalist client-side web utility for calibrating, scaling, cropping, and arranging images onto standard or custom paper grid sheets for printing.

Planar is a modern, lightweight grid tool built for designers, paper-crafters, and creators. It allows you to arrange, crop, scale, and tile images across multiple physical print pages locally in your browser.

---

## 🚀 Key Features

*   **Real-World Physical Calibration**: Calibrate real-world dimensions (mm, cm, in) by selecting two points on your image and entering their actual measurement.
*   **Tiled Grid & Flow Layouts**: Distribute images dynamically across single sheets or multi-page tiled print layouts.
*   **Maximise Paper Space Mode**: Automatically scale and pack images to use the maximum printable paper surface area.
*   **Local Background Removal (RemBG)**: Remove backgrounds locally in your browser using high-performance, client-side WASM models (no server uploads, 100% private).
*   **Advanced Presets & Shapes**: Crop images into rectangles, circles, stars, or regular polygons. Control fillet corner radii dynamically.
*   **Smooth Gesture Canvas**: Interactive canvas supporting trackpad pinching/swiping, physical mouse wheel zoom, middle-click panning, and mobile multi-touch gestures.
*   **Modern Minimalism**: Sleek dark and light modes, zero bloat, and highly polished micro-interactions.

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have **Node.js** installed on your system.

### Installation

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

## 💻 Tech Stack

*   **Framework**: Next.js (React)
*   **Language**: TypeScript
*   **Styling**: Pure CSS (vanilla variables, responsive layout system)
*   **WASM Engine**: `@imgly/background-removal` for local background removal
*   **Icons**: Inline SVGs & Lucide React

---

## 🔒 Privacy First

Planar is fully serverless. All image scaling, cropping, background removal, and layout calculation happen strictly in your browser's local memory. No data or image files are uploaded to any external server.
