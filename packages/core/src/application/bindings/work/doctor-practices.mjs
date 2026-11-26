// Core assembly: construct once per application; collaborators are supplied explicitly.
//
// 192/03 (192/ADR-006 §2) — THE PRACTICE-RENDER LANE's core binding, one per injected lane as
// doctor-examples.mjs and doctor-diagrams.mjs are. It owns both halves the engine must not:
//
//   readPracticeRenderFacts(projectRoot) — the impure edge, called by the doctor command before the
//     engine runs. It reads the lock's record, the project's OWN config file (`readConfig`, unmerged,
//     the read the update makes — never the workspace's config, which may carry the machine's), and
//     the declared practices with their keys and targets, and answers plain data.
//   practiceRenderGroup(snapshot, ctx) — the pure `(snapshot, ctx) => Finding[]` group appended through
//     the engine's `extensionGroups` seam. It reads only `ctx.extensions.practiceRender`, and the
//     judgement is `practiceRenderFindings`, beside the one resolver of what is on (ADR-003 §3).
import { readLock } from "../../../lock.mjs";
import { RUNTIMES } from "../../../model.mjs";
import { workspacePaths } from "../../../workspace.mjs";
import { readDescriptor } from "../../../work/bundle.mjs";
import { practiceList, practiceRenderFindings, practiceRuntimes, practiceStates, practiceTargets } from "../../../work/bundle-compose.mjs";
import { readConfig } from "../../../work/headroom.mjs";

export const PRACTICE_RENDER_FACTS = "practiceRender";

export function assembleWorkDoctorPractices({ descriptor = readDescriptor } = {}) {
  async function readPracticeRenderFacts(projectRoot) {
    if (typeof projectRoot !== "string" || projectRoot === "") return null;
    const lock = await readLock(workspacePaths(projectRoot).lockPath);
    const work = lock?.work;
    if (work == null || typeof work !== "object") return { installed: false, recorded: null, practices: [] };
    const { config } = await readConfig(projectRoot);
    const declared = descriptor();
    const practices = declared.practices ?? [];
    const targets = practiceTargets(declared.members);
    // 198/ADR-001 §5 — the runtimes this install renders, as the update reads them from the lock
    // (Claude when a legacy lock names none), and the runtimes each scoped practice reaches.
    const runtimes = Array.isArray(work.runtimes) && work.runtimes.length > 0 ? work.runtimes : ["claude"];
    return {
      installed: true,
      recorded: work.practices ?? null,
      runtimes,
      practices: practiceList(practices, practiceStates(practices, config), practiceRuntimes(declared.members, Object.keys(RUNTIMES)))
        .map(({ id, keys, on, runtimes: reaches }) => ({ id, keys, on, targets: targets.get(id) ?? [], ...(reaches ? { runtimes: reaches } : {}) })),
    };
  }

  // What the doctor command hands the engine as `extensions`: this lane's facts under its own key.
  async function readExtensionFacts(workspace) {
    return { [PRACTICE_RENDER_FACTS]: await readPracticeRenderFacts(workspace?.projectRoot ?? null) };
  }

  function practiceRenderGroup(snapshot, ctx = {}) {
    return practiceRenderFindings(ctx.extensions?.[PRACTICE_RENDER_FACTS] ?? null, snapshot?.workDir);
  }

  return { readPracticeRenderFacts, readExtensionFacts, practiceRenderGroup };
}
