import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const manualChunks = (id: string) => {
    if (id.includes("src/data/jsonPromptCards.ts")) return "json-prompt-cards";
    if (id.includes("src/data/promptLibrary.ts")) return "prompt-library-data";
    if (!id.includes("node_modules")) return undefined;

    if (id.includes("node_modules/firebase")) return "firebase";
    if (id.includes("node_modules/@radix-ui")) return "radix";
    if (id.includes("node_modules/lucide-react")) return "icons";
    if (
      id.includes("node_modules/react/") ||
      id.includes("node_modules/react-dom/") ||
      id.includes("node_modules/scheduler/")
    ) {
      return "react-vendor";
    }
    return "vendor";
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    server: {
      proxy: {
        "/api": "http://localhost:8787",
      },
    },
    base: env.VITE_BASE || "./",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
