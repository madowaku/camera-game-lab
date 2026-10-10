import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      // Lazy game/MediaPipe JS is cached only after an actual game visit.
      workbox: {
        globPatterns: ["**/*.{html,css,svg,webp}", "assets/index-*.js", "assets/workbox-window*.js"],
        runtimeCaching: [{
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/") && url.pathname.endsWith(".js"),
          handler: "CacheFirst",
          options: { cacheName: "camera-lab-game-modules-v1", expiration: { maxEntries: 64, maxAgeSeconds: 2592000 } },
        }, {
          // Keep discovery quiet; cache the licensed audio after a player starts.
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/audio/tension-duel/") && url.pathname.endsWith(".mp3"),
          handler: "CacheFirst",
          options: { cacheName: "camera-lab-tension-audio-v1", expiration: { maxEntries: 5, maxAgeSeconds: 2592000 } },
        }],
      },
      manifest: {
        name: "Camera Game Lab",
        short_name: "Cam Game Lab",
        description: "Experimental camera games where your body is the controller.",
        theme_color: "#10120f",
        background_color: "#10120f",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
