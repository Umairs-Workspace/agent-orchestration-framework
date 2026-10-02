// The `assets` namespace (DSL, config inspection, config editing) is core's own logic: its bindings ARE the
// implementation, not a wrapper over a feature package. A core suite builds it from core's own assemblers and
// base services instead of reaching it through the whole assembled application.
import { createBaseServices } from "../../src/application/base.mjs";
import { assembleDsl } from "../../src/application/bindings/dsl.mjs";
import { assembleConfigInspect } from "../../src/application/bindings/config-inspect.mjs";
import { assembleConfigEditor } from "../../src/application/bindings/config-editor.mjs";
import { assembleWorkInit } from "../../src/application/bindings/work/init.mjs";
import { assembleWorkMemory } from "../../src/application/bindings/work/memory.mjs";

const base = createBaseServices();
const dsl = assembleDsl({ fsServices: base.fs, workspaceServices: base.workspace });
const configInspect = assembleConfigInspect({ dslServices: dsl, fsServices: base.fs, workspaceServices: base.workspace, degradeServices: base.degrade });
const configEditor = assembleConfigEditor({ configInspectServices: configInspect, dslServices: dsl, fsServices: base.fs, workspaceServices: base.workspace });

// `work.init` takes the memory service only to seed a backend choice; no suite here runs a recall, so both backend loaders refuse.
const refuseBackend = (name) => async () => { throw new Error(`work.init must not load the ${name} memory backend`); };
const workMemory = assembleWorkMemory({ provideMemoryLocalBackend: refuseBackend("local"), provideMemoryGraphifyBackend: refuseBackend("graphify") });
const workInit = assembleWorkInit({ workspaceServices: base.workspace, workMemoryServices: workMemory });

export const assets = Object.freeze({ dsl, configInspect, configEditor, work: Object.freeze({ init: workInit }) });
