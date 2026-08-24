import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// `vite build --mode app` produces the frontend embedded into the Tauri
// Android/ desktop apps. There the service worker must stay unregistered:
// the app is offline-capable by design and a precaching SW would keep
// serving stale bundles across APK updates.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Skip SW registration entirely for app builds.
      injectRegister: mode === "app" ? null : "auto",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "TimeWeave - Smart Weekly Planner",
        short_name: "TimeWeave",
        description:
          "A smart weekly planner for managing fixed and one-time tasks",
        theme_color: "#8b5cf6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
