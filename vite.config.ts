import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    cors: true,
    hmr: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    cors: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "firebase",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "@firebase/app",
      "@firebase/auth",
      "@firebase/firestore",
      "@firebase/component",
    ],
  },
  optimizeDeps: {
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
    ],
  },
}));
