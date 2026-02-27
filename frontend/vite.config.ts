/// <reference types="vite/client" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Must point at the TaskFlow backend (e.g. Daphne on 9000). Do not use another app's URL (e.g. paperless-ngx on 8000).
const apiBase = import.meta.env?.VITE_API_URL || "http://127.0.0.1:9000";
const wsBase = apiBase.replace(/^http/, "ws");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiBase,
        changeOrigin: true,
      },
      "/media": {
        target: apiBase,
        changeOrigin: true,
      },
      "/ws": {
        target: wsBase,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
