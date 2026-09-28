import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const previewAllowedHost = process.env.MANUS_PREVIEW_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(projectRoot, "client"),
  publicDir: path.resolve(projectRoot, "client", "public"),
  envDir: projectRoot,
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
    },
  },
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0", ...(previewAllowedHost ? { allowedHosts: [previewAllowedHost] } : {}) },
  build: {
    outDir: path.resolve(projectRoot, "dist", "public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (["/node_modules/react/", "/node_modules/react-dom/", "/node_modules/scheduler/"].some((part) => id.includes(part))) return "react-vendor";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
        },
      },
    },
  },
});
