import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "src") },
        { find: "react/jsx-runtime", replacement: path.resolve(__dirname, "node_modules/react/jsx-runtime.js") },
        { find: "react-dom/client", replacement: path.resolve(__dirname, "node_modules/react-dom/client.js") },
        { find: "react", replacement: path.resolve(__dirname, "node_modules/react") },
        { find: "react-dom", replacement: path.resolve(__dirname, "node_modules/react-dom") }
      ],
      dedupe: ["react", "react-dom", "react/jsx-runtime"]
    },
    optimizeDeps: {
      force: true,
      include: ["react", "react-dom", "react/jsx-runtime", "react-dom/client"]
    },
    server: {
      port: 4001,
      proxy: {
        "/v1": {
          target: apiUrl,
          changeOrigin: true
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react-router") || id.includes("@remix-run")) {
                return "router-vendor";
              }
              if (
                id.includes("/node_modules/react/") ||
                id.includes("/node_modules/react-dom/") ||
                id.includes("scheduler")
              ) {
                return "react-vendor";
              }
              if (id.includes("@tanstack") || id.includes("zustand") || id.includes("axios")) {
                return "data-vendor";
              }
              if (id.includes("formik") || id.includes("yup")) {
                return "form-vendor";
              }
              if (id.includes("@headlessui") || id.includes("lucide-react")) {
                return "ui-vendor";
              }
              if (id.includes("@dnd-kit")) {
                return "dnd-vendor";
              }
              if (
                id.includes("@tiptap") ||
                id.includes("prosemirror") ||
                id.includes("quill") ||
                id.includes("react-quill")
              ) {
                return "editor-vendor";
              }
              if (id.includes("date-fns") || id.includes("dayjs")) {
                return "date-vendor";
              }
              return "vendor";
            }
          }
        }
      }
    }
  };
});
