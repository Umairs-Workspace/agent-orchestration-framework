import path from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Ship the SDK's fonts with AOF rather than depending on Excalidraw's CDN.
const sdkFonts = path.join(path.dirname(createRequire(import.meta.url).resolve("@excalidraw/excalidraw")), "fonts");
const fontAssets = new Map<string, Buffer>();
function collectFonts(directory: string, prefix = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) collectFonts(path.join(directory, entry.name), relative + "/");
    else if (entry.isFile()) fontAssets.set("excalidraw/fonts/" + relative, readFileSync(path.join(directory, entry.name)));
  }
}
collectFonts(sdkFonts);
const excalidrawFonts = {
  name: "aof-excalidraw-fonts",
  generateBundle(this: { emitFile: (asset: { type: "asset"; fileName: string; source: Buffer }) => void }) {
    for (const [fileName, source] of fontAssets) this.emitFile({ type: "asset", fileName, source });
  },
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      const resource = new URL(request.url ?? "/", "http://localhost").pathname.slice(1);
      const bytes = fontAssets.get(resource);
      if (!bytes || request.method !== "GET") return next();
      response.setHeader("content-type", resource.endsWith(".woff2") ? "font/woff2" : "application/octet-stream");
      response.end(bytes);
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), excalidrawFonts],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    proxy: {
      "/api": process.env.VITE_AOF_API_URL ?? "http://127.0.0.1:4178"
    }
  }
});
