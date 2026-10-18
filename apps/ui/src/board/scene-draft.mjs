// Document fingerprints intentionally exclude SDK session state (camera, selections, tools).
// All element properties, including bindings, customData, labels and deletion, are retained.
export function sceneFileName(svgFile) {
  if (!/^ADR-\d{3}-[a-z0-9][a-z0-9-]{0,47}\.svg$/.test(svgFile)) throw new Error("Invalid ADR diagram member");
  return svgFile.slice(0, -4) + ".excalidraw";
}
export function sceneFingerprint(scene) {
  if (!scene) return "";
  return JSON.stringify({
    elements: scene.elements,
    files: scene.files,
    viewBackgroundColor: scene.appState?.viewBackgroundColor,
    gridSize: scene.appState?.gridSize,
  });
}
