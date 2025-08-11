
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "@vite-pwa/plugin";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Tasks. Habits. Moods.",
        short_name: "THM",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#111111",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
