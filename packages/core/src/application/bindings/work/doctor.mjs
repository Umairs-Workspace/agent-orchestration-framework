// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkDoctor } from "@aof/work/doctor";
import { projectExecution } from "@aof/work-graph/record";
import { createExamplesStoryProbe, EXAMPLES_BUDGET_ROWS } from "@aof/specification-by-example/story-probe";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { LOCAL_CONFIG_FILE } from "@aof/contracts/local-config";

// 199 — THE LOCAL-CONFIG LANE. `.aof/aof.config.local.json` is one person's settings; `aof work init`
// and `update` keep it in `.aof/.gitignore`, but a file added before that, or with `git add -f`, is
// tracked anyway, and then every pull imposes one person's settings on everyone. The lane says so,
// once, anchored at the work directory as the operator lane is, and names the fix.
export const CONFIG_LOCAL_TRACKED = "config-local-tracked";
const LOCAL_CONFIG_FACTS = "localConfig";

// The impure edge, read by the doctor command before the engine runs: is this checkout's local file
// tracked? Git is asked only when the file exists; no git, or no repository, reads as untracked.
function readLocalConfigFacts(workspace) {
  const aofDir = workspace?.aofDir;
  if (typeof aofDir !== "string" || aofDir === "") return null;
  const file = path.join(aofDir, LOCAL_CONFIG_FILE);
  if (!existsSync(file)) return { file, tracked: false };
  const asked = spawnSync("git", ["ls-files", "--error-unmatch", "--", LOCAL_CONFIG_FILE], { cwd: aofDir, encoding: "utf8", timeout: 30_000 });
  const shown = path.relative(workspace.projectRoot ?? path.dirname(aofDir), file).replaceAll("\\", "/");
  return { file, shown, tracked: asked.status === 0 };
}

function localConfigGroup(snapshot, ctx = {}) {
  const facts = ctx.extensions?.[LOCAL_CONFIG_FACTS];
  if (facts?.tracked !== true || typeof snapshot?.workDir !== "string") return [];
  return [{
    code: CONFIG_LOCAL_TRACKED,
    severity: "warn",
    path: snapshot.workDir,
    file: facts.file,
    message: `${facts.shown} is tracked by git, so one person's settings reach everyone who pulls. Stop tracking it and keep the file: git rm --cached ${facts.shown} (aof work update keeps it in .aof/.gitignore).`,
  }];
}

export function assembleWorkDoctor({ runStoreServices, workDoctorDiagramsServices, workDoctorExamplesServices, workDoctorPracticesServices = null, configInspectServices, provideWorkExamplesAnswers }) {
  // Core composition for work-owned doctor services.

  const { readRuns } = runStoreServices;
  const { diagramsGroup, diagramListing } = workDoctorDiagramsServices;
  const { examplesGroup } = workDoctorExamplesServices;
  // 193/ADR-006 §5 — the operator lane, its own check group, right after the examples lane.
  const { operatorGroup } = workDoctorExamplesServices;
  // 192/ADR-006 §2 — the practice-render lane, appended beside the examples lane; silent without its facts.
  const practiceRenderGroup = workDoctorPracticesServices?.practiceRenderGroup ?? null;
  const { examplesEnabledFromConfig } = configInspectServices;
  // Deferred: the answers collector is assembled after the doctor; the probe calls it only at run time.
  const collectAnswers = async (...args) => (await provideWorkExamplesAnswers()).collectAnswers(...args);
  // 135/ADR-001 §3 — specification by example composed into the engine's three neutral seams.
  const { storyProbe } = createExamplesStoryProbe({ examplesEnabledFromConfig, collectAnswers });

  const {
    CHECK_GROUPS,
    CONVENTION_DOCS,
    budgetsFromConfig,
    buildSnapshot,
    doctorWork,
    duplicateDriverNumberGroup,
    inScope,
    isDependTarget,
    isDriver,
    orphanFolderGroup,
    siblingDependencyNumber,
    staleWindowFromConfig,
  } = createWorkDoctor({ projectExecution, readRuns, diagramsGroup, diagramListing, storyProbe, budgetRows: EXAMPLES_BUDGET_ROWS, extensionGroups: [examplesGroup, operatorGroup, ...(practiceRenderGroup ? [practiceRenderGroup] : []), localConfigGroup] });

  // What the doctor command hands the engine as `extensions`: every core lane's facts, each under its own key.
  const readPracticeFacts = workDoctorPracticesServices?.readExtensionFacts ?? null;
  async function readExtensionFacts(workspace) {
    return { ...(readPracticeFacts ? await readPracticeFacts(workspace) : {}), [LOCAL_CONFIG_FACTS]: readLocalConfigFacts(workspace) };
  }

  return { readExtensionFacts, CHECK_GROUPS, CONVENTION_DOCS, budgetsFromConfig, buildSnapshot, doctorWork, duplicateDriverNumberGroup, inScope, isDependTarget, isDriver, orphanFolderGroup, siblingDependencyNumber, staleWindowFromConfig };
}
