import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path for GitHub Pages: https://<username>.github.io/paper-oss-ranking/
// All static assets and JSON fetches must use import.meta.env.BASE_URL.
export default defineConfig({
  base: "/paper-oss-ranking/",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
