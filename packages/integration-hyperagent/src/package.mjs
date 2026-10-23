// The Hyperagent package (169/ADR-007) — the planner instructions and the seven planning skills,
// written once to `<aof home>/hyperagent/` for the operator to upload to their Hyperagent account.
// Hyperagent reads no repository folder and an uploaded skill belongs to the account, so the files
// live on the machine, not in a project: the Cowork case (165/ADR-006).
//
// aof owns `<aof home>/hyperagent/` whole and rebuilds it on every run. Nothing is written inside
// the project and no lock entry is recorded: the package is the installed aof's own bytes, read
// through the reader core injects (the package's asset class, so dev, payload and packaged all
// resolve), and the doctor compares the written copy against those bytes instead.
import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export const PACKAGE_DIR = "hyperagent";
export const PLANNER_SKILLS = Object.freeze(["aof-add-milestone", "aof-add-story", "aof-add-task", "aof-prd", "aof-refine", "aof-shatter", "aof-validate"]);
// Every file of the package, relative to both the package's assets/ and `<aof home>/hyperagent/`.
// `assets/bundle.json` declares the same list as `packageFiles` (files the package ships for its own
// verbs, which core never renders), so the bundle-membership control sees no undeclared asset; the
// package suite asserts the two agree.
export const PACKAGE_FILES = Object.freeze(["AGENT.md", ...PLANNER_SKILLS.map((id) => `skills/${id}/SKILL.md`)]);

export function packageDir(aofHome) {
  return path.join(aofHome, PACKAGE_DIR);
}

// The hand-over: how the operator puts what aof wrote into Hyperagent, each file by its full path.
// Never a claim that anything was uploaded.
export function uploadSteps(dir) {
  return [
    "Upload these to your Hyperagent account (aof uploads nothing):",
    `  1. For each skill: Skills → Create skill → upload the SKILL.md file:`,
    ...PLANNER_SKILLS.map((id) => `       ${path.join(dir, "skills", id, "SKILL.md")}`),
    `  2. Create the planner agent with the instructions in ${path.join(dir, "AGENT.md")}, give it those skills, and connect the GitHub integration for the repositories it plans.`,
    "  An upload always creates a new skill: after the package changes, edit the existing skill in Hyperagent from the new file rather than uploading it again."
  ];
}

// Write the package. `readPlannerFile(relative)` returns the package's own text for one file.
export async function writeHyperagentPackage({ aofHome, readPlannerFile, dryRun = false }) {
  const dir = packageDir(aofHome);
  const files = PACKAGE_FILES.map((relative) => path.join(dir, relative));
  if (dryRun) return { dir, files, written: false, steps: uploadSteps(dir) };
  // Every file is read before the directory is touched, so a missing asset leaves the last package in place.
  const contents = await Promise.all(PACKAGE_FILES.map((relative) => readPlannerFile(relative)));
  await rm(dir, { recursive: true, force: true });
  for (const [index, relative] of PACKAGE_FILES.entries()) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents[index]);
  }
  return { dir, files, written: true, steps: uploadSteps(dir) };
}

// `missing` (any file absent), `stale` (every file present, one differs from the installed aof's),
// or `current`.
export async function inspectHyperagentPackage({ aofHome, readPlannerFile }) {
  const dir = packageDir(aofHome);
  let state = "current";
  for (const relative of PACKAGE_FILES) {
    const target = path.join(dir, relative);
    if (!existsSync(target)) return { dir, state: "missing" };
    if ((await readFile(target, "utf8")) !== (await readPlannerFile(relative))) state = "stale";
  }
  return { dir, state };
}
