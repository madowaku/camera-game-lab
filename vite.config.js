import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "artwork/tension-duel-intro.webp"],
      manifest: {
        name: "Camera Game Lab",
        short_name: "Cam Game Lab",
        description: "Experimental camera games where your body is the controller.",
        theme_color: "#0b0d10",
        background_color: "#0b0d10",
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
