// FF-6907 / ADR-006 — every local/mesh work-admission path acquires the existing
// concurrency slot first, and work.dispatch.concurrency retains one resolution home.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedBraceBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { boundSiteOffenders } from "./acd-dispatch-bound-single-home.test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const commandPath = path.join(root, "src", "commands", "dispatch.mjs");
const meshPath = path.join(root, "src", "mesh", "assignment-reclaim.mjs");
const launcherPath = path.join(root, "src", "mesh", "launcher.mjs");
const resumePath = path.join(root, "src", "commands", "mesh", "terminal-resume.mjs");

export function slotBeforeAdmissionProblems(commandSource, meshSource, launcherSource = null) {
  const command = stripComments(commandSource);
  const mesh = stripComments(meshSource);
  const problems = [];
  const localPool = command.indexOf("dispatchReadySet(");
  const localOpen = command.indexOf("resolveDispatchLane(");
  if (localPool < 0) problems.push("src/commands/dispatch.mjs has no production dispatchReadySet(...) caller");
  if (localOpen < 0 || localPool > localOpen) problems.push("the local lane is opened before the bounded pool admits it");
  const counted = mesh.indexOf("countDispatchSlotsByTarget(rows)");
  const checked = mesh.indexOf(">= dispatchBound");
  const admitted = mesh.indexOf("dispatchDirective(buildDirectiveFrame");
  if (counted < 0) problems.push("the mesh tick does not derive its counted set from assignment rows");
  if (checked < 0) problems.push("the mesh tick has no over-bound admission branch");
  if (admitted < 0) problems.push("the mesh work-directive admission call was not found");
  if (admitted >= 0 && (counted > admitted || checked > admitted)) problems.push("the mesh directive is admitted before its counted-set check");
  if (launcherSource != null) {
    const launcher = stripComments(launcherSource);
    if (!/controlDispatchReclaimInFlight\s*\.then\s*\(\s*\(\)\s*=>\s*runControlDispatchReclaimTick\s*\(/.test(launcher)) {
      problems.push("the production scheduler does not serialize control admission ticks through its in-flight tail");
    }
    if (!/controlDispatchReclaimInFlight\s*=\s*dispatchReclaimTick\s*\.catch\s*\(/.test(launcher)) {
      problems.push("a failed control admission tick can poison the scheduler's serialization tail");
    }
  }
  return problems;
}

function executableCallCount(source, name) {
  const code = stripComments(String(source ?? ""));
  const calls = [...code.matchAll(new RegExp(`\\b${name}\\s*\\(`, "g"))].length;
  const declarations = [...code.matchAll(new RegExp(`\\bfunction\\s+${name}\\s*\\(`, "g"))].length;
  return calls - declarations;
}

// 129/04 — THE LOOP SUPPLIES ITS OWN OPENER, BEHIND THE SAME DOOR. `src/loop/wave.mjs` opens a
// lane advanced to HEAD (129/ADR-002 §7) and reclaims a stale lane run first — neither of which
// the door's default opener carries — so it binds its opener onto `ctx.runDispatchLane`, the seam
// `src/commands/dispatch.mjs` calls INSIDE `dispatchReadySet`, after the admission lock and the
// pool have admitted the member. That is not a second admission door: the opener runs only when
// the door invokes it. So a file other than the door may call `resolveDispatchLane(` when, and
// only when, EVERY such call sits in the body of a function the file binds as `runDispatchLane`,
// the file asks `work:dispatch` through `invokeRegistered` (the door the opener runs behind), and
// the file is declared HERE with its reason — a second supplier is a decision this table records,
// never a reuse the scan waves through. Each leg is one named finding when it fails.
export const SUPPLIED_DISPATCH_OPENERS = new Map([
  ["src/loop/wave.mjs", "129/04 — the wave's lanes open at HEAD (`advanceTo`, ADR-002 §7) and reclaim first; the door's default opener does neither"],
]);

// The extent of an object-literal property's VALUE, from just after its `:` to the `,` or `}` that
// ends it at depth zero — the region the language draws, never a character window (the
// F-47-04-ARCH-2 trap `enclosingParenGroup` documents).
function propertyValueExtent(code, from) {
  let depth = 0;
  for (let i = from; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === "(" || ch === "{" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "}" || ch === "]") {
      if (depth === 0) return code.slice(from, i);
      depth -= 1;
    } else if (ch === "," && depth === 0) return code.slice(from, i);
  }
  return code.slice(from);
}

// The `[start, end)` spans of the bodies of every function DECLARATION the file binds as its
// `runDispatchLane` opener — the value of each `runDispatchLane:` property, read for the names it
// calls or references, then each name's `function <name>(` cut by matched parens and braces.
function suppliedOpenerSpans(code) {
  const names = new Set();
  for (const match of code.matchAll(/\brunDispatchLane\s*:/g)) {
    const value = propertyValueExtent(code, match.index + match[0].length);
    for (const id of value.matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*:)/g)) names.add(id[1]);
  }
  const spans = [];
  for (const name of names) {
    for (const header of code.matchAll(new RegExp(`\\bfunction\\s+${name}\\s*\\(`, "g"))) {
      const params = matchedParenSpan(code, header.index);
      if (params == null) continue;
      const body = matchedBraceBody(code, params.close);
      if (body == null) continue;
      const open = code.indexOf("{", params.close);
      spans.push([open, open + body.length + 2]);
    }
  }
  return spans;
}

// Whole-src closure for FF-6907: a new production caller is a new admission door,
// not an innocuous reuse. Local lane opens must stay behind work:dispatch's pool;
// assignment directive admission stays in the counted control scan; and that scan
// has exactly one production scheduler, whose source shape is checked above.
export function productionAdmissionPathProblems(listing, suppliers = SUPPLIED_DISPATCH_OPENERS) {
  const problems = [];
  let localCalls = 0;
  let meshAdmissions = 0;
  let tickCalls = 0;
  let resumeAdmissions = 0;
  for (const file of listing ?? []) {
    const rel = String(file?.path ?? "").replaceAll("\\", "/");
    const code = stripComments(String(file?.source ?? ""));
    const opens = executableCallCount(code, "resolveDispatchLane");
    if (opens > 0 && rel === "src/commands/dispatch.mjs") {
      localCalls += opens;
    } else if (opens > 0) {
      const spans = suppliedOpenerSpans(code);
      const outside = [...code.matchAll(/\bresolveDispatchLane\s*\(/g)]
        .filter((call) => !/\bfunction\s+$/.test(code.slice(Math.max(0, call.index - 40), call.index)))
        .filter((call) => !spans.some(([start, end]) => call.index >= start && call.index < end));
      if (outside.length > 0 || spans.length === 0) problems.push(`${rel} opens a local dispatch lane outside the bounded production door`);
      else if (!/\binvokeRegistered\s*\(\s*["']work:dispatch["']/.test(code)) problems.push(`${rel} binds a dispatch opener but never asks work:dispatch — there is no door for it to run behind`);
      else if (!suppliers.has(rel)) problems.push(`${rel} supplies a dispatch opener without a declared reason — add it to SUPPLIED_DISPATCH_OPENERS or open through the door`);
    }
    const admissions = [...code.matchAll(/dispatchDirective\s*\(\s*buildDirectiveFrame\s*\(/g)].length;
    if (admissions > 0) {
      meshAdmissions += admissions;
      if (rel !== "src/mesh/assignment-reclaim.mjs") problems.push(`${rel} admits assignment work outside the counted control scan`);
    }
    const scheduledTicks = executableCallCount(code, "runControlDispatchReclaimTick");
    if (scheduledTicks > 0) {
      tickCalls += scheduledTicks;
      if (rel !== "src/mesh/launcher.mjs") problems.push(`${rel} schedules the admission scan outside its serialized production seam`);
    }
    const resumes = executableCallCount(code, "buildTerminalResumeEnvelope");
    if (resumes > 0) {
      resumeAdmissions += resumes;
      if (rel !== "src/commands/mesh/terminal-resume.mjs") problems.push(`${rel} resumes parked work outside the counted resume door`);
      if (!code.includes("countDispatchSlotsByTarget(")) problems.push(`${rel} resumes parked work without the shared counted set`);
    }
  }
  if (localCalls !== 1) problems.push(`expected exactly one production resolveDispatchLane call at the door, found ${localCalls}`);
  if (meshAdmissions !== 1) problems.push(`expected exactly one work-directive admission call, found ${meshAdmissions}`);
  if (tickCalls !== 1) problems.push(`expected exactly one production control-tick caller, found ${tickCalls}`);
  if (resumeAdmissions !== 1) problems.push(`expected exactly one production parked-resume admission call, found ${resumeAdmissions}`);
  return problems;
}

export function sharedOccupancyProblems(listing) {
  const problems = [];
  let definitions = 0;
  for (const file of listing ?? []) {
    const rel = String(file?.path ?? "").replaceAll("\\", "/");
    const code = stripComments(String(file?.source ?? ""));
    definitions += [...code.matchAll(/\bfunction\s+assignmentOccupiesDispatchSlot\s*\(/g)].length;
    const respell = /state\s*===\s*["']accepted["'][\s\S]{0,160}state\s*===\s*["']running["'][\s\S]{0,160}needs-input/.test(code);
    if (respell && rel !== "src/mesh/assignment-reclaim.mjs") problems.push(`${rel} re-spells accepted/running/needs-input occupancy`);
    if (/occupiedByTarget\s*=\s*(?:new\s+Map\s*\(\s*dispatchedIds|dispatchedIds)/.test(code)) {
      problems.push(`${rel} treats the unpersisted once-guard as occupancy`);
    }
  }
  if (definitions !== 1) problems.push(`expected exactly one assignmentOccupiesDispatchSlot definition, found ${definitions}`);
  return problems;
}

async function srcListing() {
  const listing = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".mjs")) listing.push({
        path: path.relative(root, full).split(path.sep).join("/"),
        source: await readFile(full, "utf8"),
      });
    }
  };
  await walk(path.join(root, "src"));
  return listing;
}

export const archTests = [
  {
    name: "arch/69 FF-6907 (acd-slot-before-admission): local lane materialisation and mesh work admission consult their bounded counted sets first",
    run: async () => {
      const problems = slotBeforeAdmissionProblems(
        await readFile(commandPath, "utf8"),
        await readFile(meshPath, "utf8"),
        await readFile(launcherPath, "utf8"),
      );
      assert.deepEqual(problems, [], `slot-before-admission violations:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/69 FF-6907 (acd-slot-before-admission): every production local-open, directive-admission and control-scheduler path stays behind its governed seam",
    run: async () => {
      const listing = await srcListing();
      const problems = productionAdmissionPathProblems(listing);
      assert.deepEqual(problems, [], `admission-path violations:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/69 FF-6907 (acd-slot-before-admission): work.dispatch.concurrency still has exactly its pre-existing one home",
    run: async () => {
      const listing = await srcListing();
      assert.ok(listing.length > 100, "the whole src tree was enumerated (non-vacuous)");
      const offenders = boundSiteOffenders(listing);
      assert.deepEqual(offenders, [], `concurrency-bound offenders:\n  ${offenders.join("\n  ")}`);
    },
  },
  {
    name: "arch/69 FF-6907 self-check: an unpooled local open and a mesh check moved after send each trip the detector",
    run: () => {
      const goodCommand = "dispatchReadySet(rows, (row) => resolveDispatchLane(root, row.ref));";
      const goodMesh = "countDispatchSlotsByTarget(rows); if (used >= dispatchBound) continue; dispatchDirective(buildDirectiveFrame(x));";
      const goodLauncher = "let controlDispatchReclaimInFlight; const dispatchReclaimTick = controlDispatchReclaimInFlight.then(() => runControlDispatchReclaimTick(ws, server)); controlDispatchReclaimInFlight = dispatchReclaimTick.catch(fail);";
      assert.deepEqual(slotBeforeAdmissionProblems(goodCommand, goodMesh, goodLauncher), []);
      assert.ok(slotBeforeAdmissionProblems("resolveDispatchLane(root, ref);", goodMesh).some((p) => p.includes("production")));
      assert.ok(slotBeforeAdmissionProblems(goodCommand, "dispatchDirective(buildDirectiveFrame(x)); countDispatchSlotsByTarget(rows); if (used >= dispatchBound) continue;").some((p) => p.includes("before")));
      assert.ok(slotBeforeAdmissionProblems(goodCommand, goodMesh, "runControlDispatchReclaimTick(ws, server);").some((p) => p.includes("serialize")));

      const homes = [
        { path: "src/commands/dispatch.mjs", source: goodCommand },
        { path: "src/mesh/assignment-reclaim.mjs", source: `export async function runControlDispatchReclaimTick() { ${goodMesh} }` },
        { path: "src/mesh/launcher.mjs", source: goodLauncher },
        { path: "src/commands/mesh/terminal-resume.mjs", source: "countDispatchSlotsByTarget(rows); buildTerminalResumeEnvelope(node, signal);" },
      ];
      assert.deepEqual(productionAdmissionPathProblems(homes), []);
      const bypasses = productionAdmissionPathProblems([
        ...homes,
        { path: "src/commands/other.mjs", source: "resolveDispatchLane(root, ref);" },
        { path: "src/other-scheduler.mjs", source: "runControlDispatchReclaimTick(ws, server);" },
      ]);
      assert.ok(bypasses.some((p) => p.includes("other.mjs")), "an added local-open door is named");
      assert.ok(bypasses.some((p) => p.includes("other-scheduler.mjs")), "an added scheduler door is named");
    },
  },
  {
    name: "arch/69 FF-6907 self-check (129/04): a supplied opener is admitted only inside its runDispatchLane-bound function, behind a work:dispatch ask, and declared — each leg fails on its own",
    run: () => {
      const homes = [
        { path: "src/commands/dispatch.mjs", source: "dispatchReadySet(rows, (row) => typeof ctx.runDispatchLane === \"function\" ? ctx.runDispatchLane(row) : resolveDispatchLane(root, row.ref));" },
        { path: "src/mesh/assignment-reclaim.mjs", source: "export async function runControlDispatchReclaimTick() { countDispatchSlotsByTarget(rows); if (used >= dispatchBound) continue; dispatchDirective(buildDirectiveFrame(x)); }" },
        { path: "src/mesh/launcher.mjs", source: "controlDispatchReclaimInFlight.then(() => runControlDispatchReclaimTick(ws, server)); controlDispatchReclaimInFlight = dispatchReclaimTick.catch(fail);" },
        { path: "src/commands/mesh/terminal-resume.mjs", source: "countDispatchSlotsByTarget(rows); buildTerminalResumeEnvelope(node, signal);" },
      ];
      // the wave's real shape: the opener is a declaration, the binding is a ternary whose arrow calls it, the ask is invokeRegistered
      const wave = "async function openLane(ref, base) {\n  if (stale(ref)) { return null; }\n  return await resolveDispatchLane(primaryRoot, ref, { advanceTo: base, exec });\n}\nconst dispatchCtx = { ...ctx, runDispatchLane: typeof ctx.runDispatchLane === \"function\" ? ctx.runDispatchLane : (member) => openLane(member.ref, baseCommit), other: 1 };\nawait invokeRegistered(\"work:dispatch\", { refs }, dispatchCtx);\n";
      assert.deepEqual(productionAdmissionPathProblems([...homes, { path: "src/loop/wave.mjs", source: wave }]), [], "the declared supplier, behind the door, is not a finding");
      // leg 1: a call outside the bound opener's body is the bypass, even in the declared file
      const outside = wave + "resolveDispatchLane(primaryRoot, other);\n";
      assert.ok(productionAdmissionPathProblems([...homes, { path: "src/loop/wave.mjs", source: outside }]).some((p) => p.includes("wave.mjs opens a local dispatch lane outside")), "a call outside the opener is named");
      // leg 1b: an opener bound to a name the file never declares as a function is no opener
      const arrowOnly = "const openLane = (ref) => resolveDispatchLane(root, ref);\nconst c = { runDispatchLane: (m) => openLane(m.ref) };\nawait invokeRegistered(\"work:dispatch\", {}, c);\n";
      assert.ok(productionAdmissionPathProblems([...homes, { path: "src/loop/wave.mjs", source: arrowOnly }]).some((p) => p.includes("wave.mjs opens a local dispatch lane outside")), "an arrow opener's call site is not inside a declaration the scan can cut");
      // leg 2: an opener with no work:dispatch ask has no door to run behind
      const noAsk = wave.replace(/await invokeRegistered\("work:dispatch"[^\n]*\n/, "");
      assert.ok(productionAdmissionPathProblems([...homes, { path: "src/loop/wave.mjs", source: noAsk }]).some((p) => p.includes("never asks work:dispatch")), "an opener without the ask is named");
      // leg 3: an undeclared supplier is named even when it is behind the door
      assert.ok(productionAdmissionPathProblems([...homes, { path: "src/loop/other.mjs", source: wave }]).some((p) => p.includes("other.mjs supplies a dispatch opener without a declared reason")), "an undeclared supplier is named");
      // and the door count is the door's alone: the supplier's call never makes it two
      assert.ok(!productionAdmissionPathProblems([...homes, { path: "src/loop/wave.mjs", source: wave }]).some((p) => p.includes("expected exactly one")), "the supplier does not count against the door");
      assert.ok(productionAdmissionPathProblems([{ ...homes[0], source: homes[0].source + " resolveDispatchLane(root, again);" }, ...homes.slice(1)]).some((p) => p.includes("expected exactly one production resolveDispatchLane call at the door, found 2")), "a second door-side call is still counted");
    },
  },
  {
    name: "arch/69 FF-6911 (acd-slot-before-admission): assignment occupancy has one home and every start/resume door uses the shared counted set before sending",
    run: async () => {
      const listing = await srcListing();
      assert.deepEqual(sharedOccupancyProblems(listing), []);
      assert.deepEqual(productionAdmissionPathProblems(listing), []);

      const mesh = stripComments(await readFile(meshPath, "utf8"));
      const resume = stripComments(await readFile(resumePath, "utf8"));
      assert.ok(mesh.indexOf("countDispatchSlotsByTarget(rows)") < mesh.indexOf("dispatchDirective(buildDirectiveFrame"), "tick counts before directive send");
      assert.ok(resume.indexOf("countDispatchSlotsByTarget(listAllAssignments(admissionStore))") < resume.indexOf("buildTerminalResumeEnvelope("), "resume counts before envelope send");
      assert.ok(resume.indexOf("reserveParkedAssignmentResume(") < resume.indexOf("buildTerminalResumeEnvelope("), "resume atomically rejoins occupancy before spawn can be requested");
    },
  },
  {
    name: "arch/69 FF-6911 self-check: a second occupancy definition, a re-spelled predicate, a once-guard count and an uncounted resume door each fail",
    run: () => {
      const base = [{ path: "src/mesh/assignment-reclaim.mjs", source: "function assignmentOccupiesDispatchSlot(row) { return true; }" }];
      assert.deepEqual(sharedOccupancyProblems(base), []);
      assert.ok(sharedOccupancyProblems([...base, { path: "src/other.mjs", source: "function assignmentOccupiesDispatchSlot(row) {}" }]).some((p) => p.includes("exactly one")));
      assert.ok(sharedOccupancyProblems([...base, { path: "src/other.mjs", source: 'row.state === "accepted" || row.state === "running" && row.code !== "needs-input";' }]).some((p) => p.includes("re-spells")));
      assert.ok(sharedOccupancyProblems([...base, { path: "src/other.mjs", source: "const occupiedByTarget = dispatchedIds;" }]).some((p) => p.includes("once-guard")));
      const doors = [
        { path: "src/commands/dispatch.mjs", source: "dispatchReadySet(rows, () => resolveDispatchLane());" },
        { path: "src/mesh/assignment-reclaim.mjs", source: "function runControlDispatchReclaimTick() { countDispatchSlotsByTarget(rows); dispatchDirective(buildDirectiveFrame()); }" },
        { path: "src/mesh/launcher.mjs", source: "runControlDispatchReclaimTick();" },
        { path: "src/commands/mesh/terminal-resume.mjs", source: "buildTerminalResumeEnvelope();" },
      ];
      assert.ok(productionAdmissionPathProblems(doors).some((p) => p.includes("without the shared counted set")));
    },
  },
];
