import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps the build portable: it works from any folder, GitHub Pages, or a CDN.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
