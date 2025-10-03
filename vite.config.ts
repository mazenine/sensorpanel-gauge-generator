import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/sensorpanel-gauge-generator/", // needed for correct paths on GitHub Pages
  server: {
    open: true // automatically open browser on npm run dev
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "esnext"
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
