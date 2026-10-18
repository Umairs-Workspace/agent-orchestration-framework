import assert from "node:assert/strict";
import { sceneFileName, sceneFingerprint } from "../src/board/scene-draft.mjs";

const scene = () => ({ elements: [{ id: "api", type: "text", text: "API", x: 10, y: 20, customData: { adr: "ADR-002" } }], files: {}, appState: { viewBackgroundColor: "#fff", gridSize: 20 } });
export const sceneDraftTests = [
  { name: "scene draft: filenames are confined to ADR diagram members", run: () => {
    assert.equal(sceneFileName("ADR-002-service.svg"), "ADR-002-service.excalidraw");
    for (const name of ["../ADR-002-api.svg", "ADR-002-api.svg?path=x", "x.svg", "ADR-2-a.svg"]) assert.throws(() => sceneFileName(name));
  } },
  { name: "scene draft: selection, tool and camera changes are not document edits", run: () => {
    const original = scene();
    const movedCamera = structuredClone(original);
    Object.assign(movedCamera.appState, { selectedElementIds: { api: true }, zoom: { value: 3 }, scrollX: 42, activeTool: { type: "arrow" } });
    assert.equal(sceneFingerprint(original), sceneFingerprint(movedCamera));
  } },
  { name: "scene draft: label, geometry, bindings, metadata and embedded files change the fingerprint", run: () => {
    const original = scene();
    for (const patch of [{ text: "Renamed API" }, { x: 500 }, { customData: { adr: "ADR-003" } }, { boundElements: [{ id: "arrow", type: "arrow" }] }, { isDeleted: true }]) {
      const changed = structuredClone(original); Object.assign(changed.elements[0], patch);
      assert.notEqual(sceneFingerprint(original), sceneFingerprint(changed));
    }
    const changed = structuredClone(original); changed.files.image = { dataURL: "data:image/png;base64,AQ==" };
    assert.notEqual(sceneFingerprint(original), sceneFingerprint(changed));
    const recolored = structuredClone(original); recolored.appState.viewBackgroundColor = "#000";
    assert.notEqual(sceneFingerprint(original), sceneFingerprint(recolored));
  } },
];
