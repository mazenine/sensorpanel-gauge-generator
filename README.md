# 🧭 AIDA64 Gauge Generator

[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](#license)
[![AIDA64](https://img.shields.io/badge/Powered%20by-AIDA64-0083C9.svg)](https://www.aida64.com)

A modern web-based tool for creating **custom AIDA64 SensorPanel gauges** — both **arc** and **bar** styles — with real-time preview, flexible gradients, glow effects, and easy PNG export.

Developed by **FinalWire Ltd.**, makers of [AIDA64](https://www.aida64.com).

---

## 🚀 Features

- **Two gauge types:** Arc and Bar  
- **Segmented or continuous** rendering modes  
- **Gradient and warning color zones** with live editing  
- **Soft, Ring, or Legacy glow** effects with adjustable intensity  
- **Base and frame layers** for enhanced visuals  
- **Live preview** powered by Canvas  
- **PNG export** with multiple frames for animation or segmented states  
- **Preset support** for saving and reusing gauge styles

---

## 🧩 Live App

👉 **Try it online:** [https://finalwire.github.io/aida64-gauge-generator/](https://finalwire.github.io/aida64-gauge-generator/)

No installation required — everything runs locally in your browser.

---

## 💡 For Users

### ▶️ How to Use

1. Open the [Gauge Generator web app](https://finalwire.github.io/aida64-gauge-generator/).  
2. Select your **gauge type** (Arc or Bar).  
3. Adjust parameters under the following sections:
   - **Main** – radius, length, thickness, colors, segmentation, gap, etc.  
   - **Warnings** – add color zones for temperature or usage thresholds.  
   - **Glow** – choose between soft halo, ring, or legacy double-glow.  
   - **Base** – enable and color a background shape.  
   - **Export** – define frame count and export mode (segmented or continuous).  
4. Preview updates live as you tweak values.  
5. Click **Export PNG** to download all frames as a ZIP file.

### 💾 Export Details
- **Continuous gauges:** 10–101 frames (default 16).  
- **Segmented gauges:** one PNG per segment + optional base frame.  
- Exported ZIP files are ready to import into **AIDA64 SensorPanel**.

---

## 🧠 For Developers

### 🏗️ Setup

**Requirements**
- Node.js ≥ 18
- npm (or yarn/pnpm)

**Installation**
```bash
git clone https://github.com/finalwire/aida64-gauge-generator.git
cd aida64-gauge-generator
npm install
