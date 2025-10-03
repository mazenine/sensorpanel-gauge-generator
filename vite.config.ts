import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/sensorpanel-gauge-generator/", 
  server: {
    open: true 
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
