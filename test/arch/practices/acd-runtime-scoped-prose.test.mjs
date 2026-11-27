// FF-19802 — Claude-only prose lands on Claude and nowhere else (milestone 198 / story 00,
// 198/ADR-001 §3, §4).
//
// Covers the FF-19802 scenarios of 198/00's
//   tasks/01_a-scoped-fragment-lands-only-where-it-is-for.feature
//
// For each fragment that declares `runtimes`, with every practice on:
//   - each runtime it names renders the member holding the fragment's body;
//   - each runtime it does not name renders the member holding none of it, byte-for-byte as it does
//     with the fragment deleted from the descriptor (which also catches a scoped replacer that
//     removed what it replaces from a runtime it is not for);
// and, with its own practice off, every runtime renders the member as with the fragment deleted.
//
// Two legs: 192/00's fixture with a Claude-only fragment in a command and in an agent brief, so the
// control is never empty, and the shipped bundle's every scoped fragment, of which there is none
// until 198/02 ships the design-system practice. The planted cases feed the control a faulty
// composer through a test-only wrapper around the real load, never a flag in production code.
import assert from "node:assert/strict";
import { readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../../packages/core/src/work/bundle.mjs";
import { fragmentSection } from "../../../packages/core/src/work/bundle-compose.mjs";
import { RUNTIMES } from "../../../packages/core/src/model.mjs";
import { only, practiceOn, scopedFixture } from "../../../packages/core/test/bundle-compose.suite.mjs";

const ALL = Object.keys(RUNTIMES);
const scopedOf = (descriptor) => descriptor.members.filter((member) => member.kind === "fragment" && Array.isArray(member.runtimes));

// A subject is `{ descriptor, readText, load(config, drop) }`: `load` composes the bundle for
// `config` with the fragments `drop` names deleted from the descriptor.
function subjectOf(descriptor, readText) {
  const load = (config, drop = []) => loadBundle({ descriptor: { ...descriptor, members: descriptor.members.filter((member) => !drop.includes(member.id)) }, config, readText });
  return { descriptor, readText, load };
}

// Each runtime's rendered files of one member, as `Map<runtime, string>` (the files joined).
function rendered(bundle, target) {
  const id = target.slice(target.indexOf(":") + 1);
  const byRuntime = new Map(ALL.map((runtime) => [runtime, []]));
  for (const output of renderBundleOutputs(only(bundle, id), { runtimes: ALL })) byRuntime.get(output.runtime)?.push(`${output.path}\n${output.content}`);
  return new Map([...byRuntime].map(([runtime, files]) => [runtime, files.sort().join("\n\0\n")]));
}

// The body a named runtime takes: its own variant body when the fragment has one, else the common.
function bodyFor(fragment, runtime, readText) {
  const source = fragment.variants?.[runtime] ?? { file: fragment.file, section: fragment.section };
  const text = readText(fragment.assetClass ?? "bundle", source.file);
  return fragmentSection(text, source.section ?? fragment.slot);
}

// Each leak, named by fragment, member and runtime.
export function scopedLeaks(subject) {
  const leaks = [];
  const practices = subject.descriptor.practices ?? [];
  for (const fragment of scopedOf(subject.descriptor)) {
    const leak = (runtime, why) => leaks.push({ fragment: fragment.id, member: fragment.target, runtime, why });
    const on = rendered(subject.load(practiceOn(practices)), fragment.target);
    const deletedOn = rendered(subject.load(practiceOn(practices), [fragment.id]), fragment.target);
    for (const runtime of ALL) {
      const text = on.get(runtime);
      if (text === "") continue;
      if (fragment.runtimes.includes(runtime)) {
        if (!text.includes(bodyFor(fragment, runtime, subject.readText))) leak(runtime, "it names the runtime, and its render lacks the body");
        continue;
      }
      const body = bodyFor(fragment, fragment.runtimes.find((named) => !fragment.variants?.[named]) ?? fragment.runtimes[0], subject.readText);
      if (text.includes(body)) leak(runtime, "it does not name the runtime, and its render holds the body");
      else if (text !== deletedOn.get(runtime)) leak(runtime, "it does not name the runtime, and its render differs from the render with the fragment deleted");
    }
    const offConfig = practiceOn(practices.filter((practice) => practice.id !== fragment.practice));
    const off = rendered(subject.load(offConfig), fragment.target);
    const deletedOff = rendered(subject.load(offConfig, [fragment.id]), fragment.target);
    for (const runtime of ALL) if (off.get(runtime) !== deletedOff.get(runtime)) leak(runtime, "its practice is off, and the render differs from the render with the fragment deleted");
  }
  return leaks;
}

// 198/02 — the design-system practice's leg, as FF-19802 words it: with the practice on, Claude's
// render of each target holds each of the practice's fragment bodies, and every other runtime's
// render holds none of them. It reads every fragment of the practice, scoped or not, so a fragment
// that loses its `runtimes` is caught here even though the sweep above no longer sees it.
export function claudeOnlyLeaks(subject, practice = "design-system") {
  const leaks = [];
  const on = practiceOn(subject.descriptor.practices ?? []);
  const bundle = subject.load(on);
  for (const fragment of subject.descriptor.members.filter((member) => member.kind === "fragment" && member.practice === practice)) {
    const body = bodyFor({ ...fragment, variants: undefined }, "claude", subject.readText);
    for (const [runtime, text] of rendered(bundle, fragment.target)) {
      if (text === "") continue;
      if (runtime === "claude" && !text.includes(body)) leaks.push({ fragment: fragment.id, member: fragment.target, runtime, why: "Claude's render lacks the body" });
      if (runtime !== "claude" && text.includes(body)) leaks.push({ fragment: fragment.id, member: fragment.target, runtime, why: "a runtime other than Claude renders the body" });
    }
  }
  return leaks;
}

const describe = (leaks) => leaks.map(({ fragment, member, runtime, why }) => `fragment ${fragment}, member ${member}, runtime ${runtime}: ${why}`).join("; ");
const assertNoLeak = (leaks, what) => assert.deepEqual(leaks, [], `${what}: ${describe(leaks)}`);

// The fixture leg: the Claude-only fragment in the command "demo", and the agent brief's fragment
// made Claude-only too.
function fixture(plant = () => {}) {
  const load = scopedFixture((doc, notes) => {
    const agent = doc.members.find((member) => member.id === "notes-agent");
    Object.assign(agent, { runtimes: ["claude"], file: "fragments/notes/claude.md" });
    delete agent.variants;
    plant(doc, notes);
  });
  return subjectOf(load.descriptor(), load.readText);
}

// The replacer fixture: the unscoped "alpha" in "demo.notes", replaced by the Claude-only "alpha-plus".
function replacerFixture() {
  return fixture((doc) => {
    doc.practices.push({ id: "plus", title: "Plus", summary: "Replaces alpha for Claude.", keys: ["work.plus.enabled"] });
    doc.members = doc.members.filter((member) => member.id !== "notes-demo" && member.id !== "notes-agent");
    doc.members.push(
      { id: "alpha", kind: "fragment", practice: "notes", target: "command:demo", slot: "demo.notes", file: "alpha.md", variants: { codex: { file: "alpha.md" } } },
      { id: "alpha-plus", kind: "fragment", practice: "plus", target: "command:demo", slot: "demo.notes", file: "alpha-plus.md", runtimes: ["claude"], replaces: "alpha" },
    );
  });
}

// The shipped bundle as a subject, and 198/02's design-system targets in it.
const shipped = () => subjectOf(readDescriptor(), readAssetText);
const DESIGN_SYSTEM_TARGETS = Object.freeze(["agent:aof-designer", "command:refine", "command:verify", "command:verify"]);

// A copy of the subject with one scoped fragment made unscoped: `runtimes` dropped, and its common
// body also given to Codex, whose authored variant carries the slot, so the load accepts it.
function madeUnscoped(subject, id) {
  const members = subject.descriptor.members.map((member) => {
    if (member.id !== id) return member;
    const { runtimes: _dropped, ...rest } = member;
    return { ...rest, variants: { codex: { file: member.file } } };
  });
  return subjectOf({ ...subject.descriptor, members }, subject.readText);
}

// ── the planted composers: test-only wrappers around the real load ─────────────────────────────

// Fills a common text once, with Claude's selection, and serves it to every runtime.
const fillsOnce = (subject) => ({ ...subject, load: (config, drop) => {
  const bundle = subject.load(config, drop);
  for (const resource of bundle.resources) if (resource.commonBodies) { resource.body = resource.commonBodies.claude; delete resource.commonBodies; }
  return bundle;
} });
// Drops every scoped fragment: each runtime is served the body no scoped fragment is in.
const dropsScoped = (subject) => ({ ...subject, load: (config, drop) => {
  const bundle = subject.load(config, drop);
  for (const resource of bundle.resources) delete resource.commonBodies;
  return bundle;
} });
// Works out the replacements before dropping what is not for the runtime, so a scoped replacer
// removes what it replaces from every runtime: each runtime it does not name is served the fill
// with neither the replacer nor what it replaces.
const replacesEverywhere = (subject) => ({ ...subject, load: (config, drop = []) => {
  const bundle = subject.load(config, drop);
  const replaced = scopedOf(subject.descriptor).filter((fragment) => fragment.replaces && !drop.includes(fragment.id));
  if (replaced.length === 0) return bundle;
  const without = subject.load(config, [...drop, ...replaced.flatMap((fragment) => [fragment.id, fragment.replaces])]);
  for (const resource of bundle.resources) {
    const twin = without.resources.find((entry) => entry.kind === resource.kind && entry.id === resource.id);
    const named = new Set(replaced.flatMap((fragment) => fragment.runtimes));
    if (resource.commonBodies) for (const runtime of Object.keys(resource.commonBodies)) if (!named.has(runtime)) resource.commonBodies[runtime] = twin.commonBodies?.[runtime] ?? twin.body;
    for (const [runtime, variant] of Object.entries(resource.runtimeVariants ?? {})) if (!named.has(runtime) && variant.body != null) Object.assign(variant, twin.runtimeVariants[runtime]);
  }
  return bundle;
} });

export const archTests = [
  {
    name: "arch/198 FF-19802 · Claude-only prose lands on Claude and nowhere else (two legs) — the fixture leg, a Claude-only fragment in a command and in an agent brief",
    run: () => {
      const subject = fixture();
      assert.deepEqual(scopedOf(subject.descriptor).map((fragment) => fragment.target).sort(), ["agent:aof-demo", "command:demo"], "the fixture's scoped fragments fill a command and an agent brief");
      assertNoLeak(scopedLeaks(subject), "the fixture bundle");
      assertNoLeak(scopedLeaks(replacerFixture()), "the replacer fixture");
    },
  },
  {
    name: "arch/198 FF-19802 · Claude-only prose lands on Claude and nowhere else (two legs) — the shipped leg, every fragment that declares runtimes",
    run: () => {
      const subject = shipped();
      assert.deepEqual(scopedOf(subject.descriptor).filter((fragment) => fragment.practice === "design-system").map((fragment) => fragment.target).sort(), DESIGN_SYSTEM_TARGETS, "198/02's three fragments and 198/03's re-sync are in the sweep, so the shipped leg is not empty");
      assertNoLeak(scopedLeaks(subject), "the shipped bundle");
      assertNoLeak(claudeOnlyLeaks(subject), "the design-system practice");
    },
  },
  // 198/02 task 00 — the same control over the shipped bundle, each red named by fragment and runtime.
  ...[
    ["one of the design-system fragments made unscoped, with a Codex body so it still loads", () => madeUnscoped(shipped(), "design-system-refine-canvas"), { fragment: "design-system-refine-canvas", member: "command:refine", runtime: "opencode" }],
    ["a composer that loses the Claude leg, so Claude's render lacks the body", () => dropsScoped(shipped()), { fragment: "design-system-verify-pull-back", member: "command:verify", runtime: "claude" }],
    // 198/03 task 02 — the re-sync's fragment made unscoped: both other runtimes are named.
    ["the re-sync's checks.design-system fragment made unscoped (Codex named)", () => madeUnscoped(shipped(), "design-system-verify-re-sync"), { fragment: "design-system-verify-re-sync", member: "command:verify", runtime: "codex" }],
    ["the re-sync's checks.design-system fragment made unscoped (OpenCode named)", () => madeUnscoped(shipped(), "design-system-verify-re-sync"), { fragment: "design-system-verify-re-sync", member: "command:verify", runtime: "opencode" }],
  ].map(([planted, subject, expected]) => ({
    name: `arch/198 FF-19802 red probe · the shipped bundle turns the control red — ${planted}`,
    run: () => {
      const planted = subject();
      const leaks = [...scopedLeaks(planted), ...claudeOnlyLeaks(planted)];
      assert.ok(leaks.some((leak) => leak.fragment === expected.fragment && leak.member === expected.member && leak.runtime === expected.runtime), `the control names the fragment, the member and the runtime: ${describe(leaks)}`);
      assert.throws(() => assertNoLeak(leaks, "planted"), (error) => Object.values(expected).every((name) => error.message.includes(name)));
    },
  })),
  ...[
    ["a composer that fills a common text once and serves it to every runtime", () => fillsOnce(fixture()), { fragment: "notes-demo", member: "command:demo", runtime: "opencode" }],
    ["a composer that drops every scoped fragment, so the Claude render lacks the body", () => dropsScoped(fixture()), { fragment: "notes-demo", member: "command:demo", runtime: "claude" }],
    ['a selection that ignores "runtimes" when a scoped fragment replaces another', () => replacesEverywhere(replacerFixture()), { fragment: "alpha-plus", member: "command:demo", runtime: "opencode" }],
  ].map(([planted, subject, expected]) => ({
    name: `arch/198 FF-19802 · each planted leak turns the control red — ${planted}`,
    run: () => {
      const leaks = scopedLeaks(subject());
      assert.ok(leaks.some((leak) => leak.fragment === expected.fragment && leak.member === expected.member && leak.runtime === expected.runtime), `the control names the fragment, the member and the runtime: ${describe(leaks)}`);
      assert.throws(() => assertNoLeak(leaks, "planted"), (error) => Object.values(expected).every((name) => error.message.includes(name)));
    },
  })),
];
