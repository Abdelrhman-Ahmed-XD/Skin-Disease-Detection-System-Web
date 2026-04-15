import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    // Target modern browsers — smaller output
    target: "esnext",
    // Increase chunk warning threshold
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor chunks so browser can cache them separately
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "vendor-motion":   ["framer-motion"],
          "vendor-charts":   ["recharts"],
          "vendor-ui":       ["lucide-react", "react-hot-toast", "react-dropzone"],
        },
      },
    },
    // Inline small assets (< 4 kB) to save requests
    assetsInlineLimit: 4096,
    // Enable source maps for debugging (remove for smallest build)
    sourcemap: false,
  },
  // Pre-bundle deps for faster cold starts in dev
  optimizeDeps: {
    include: [
      "react", "react-dom", "react-router-dom",
      "firebase/app", "firebase/auth", "firebase/firestore",
      "framer-motion", "recharts", "lucide-react",
    ],
  },
});