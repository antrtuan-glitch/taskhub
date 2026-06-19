import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Plugin tự generate service worker, không dùng sw.js tự viết
      strategies: "generateSW",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Nạp thêm code xử lý push notification vào service worker tự sinh
        importScripts: ["push-handlers.js"],
        // Không cache Supabase API calls
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/axdtrarcovdhjdkiqjvx\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "TaskHub - Vận hành Khách sạn",
        short_name: "TaskHub",
        description: "Quản lý công việc liên bộ phận khách sạn",
        start_url: "/",
        display: "standalone",
        background_color: "#14110D",
        theme_color: "#C9A227",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
