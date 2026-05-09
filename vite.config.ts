import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.png"],
      manifest: {
        name: "BreaHealth",
        short_name: "BreaHealth",
        description: "Monitor kesehatan pernapasan via SmartBreathprint",
        start_url: "/",
        display: "standalone",
        background_color: "#f1f5f9",
        theme_color: "#0a2540",
        icons: [
          {
            src: "icon.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon.png",
            sizes: "512x512",
            type: "image/png",
          }
        ],
      },
      workbox: {
        // Cache semua asset utama
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Firebase harus tetap network-first (butuh realtime)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-cache",
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});