// WHERE THE SDK'S FONTS ARE — the one build-time seam this package offers the app's bundler. The
// SDK is THIS package's dependency, so this is where it is resolved: the app's Vite config asks
// here rather than naming `@excalidraw/excalidraw` itself, which keeps the app's manifest free of
// the SDK and the dependency declared exactly once. Node-only (it runs in the build, never in the
// browser), and it reads nothing: it answers a directory the bundler walks.
import { createRequire } from "node:module";
import path from "node:path";

export function sdkFontsDirectory() {
  return path.join(path.dirname(createRequire(import.meta.url).resolve("@excalidraw/excalidraw")), "fonts");
}
