// FF-19206 — every fragment lands on every runtime (milestone 192 / story 00, ADR-002 §6, §7).
//
// Covers the FF-19206 scenarios of
//   tasks/02_each-runtime-gets-the-body-written-for-it.feature
//
// For each fragment: its practice, target and slot are declared; each runtime whose texts carry the
// slot has a body for it. And every slot of a member's common source is in each authored variant's
// texts. The control reads the descriptor and the raw texts itself — it never asks the loader,
// whose refusal is what it audits — and runs over the shipped bundle and 192/00's fixture bundle,
// so it is never empty while the shipped bundle declares no fragment.
import assert from "node:assert/strict";
import { readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { readDescriptor } from "../../../packages/core/src/work/bundle.mjs";
import { slotsOf } from "../../../packages/core/src/work/bundle-compose.mjs";
import { BASE_FILES, baseFixture } from "../../../packages/core/test/bundle-compose.suite.mjs";

const COMMON = "common";

function section(text, name) {
  if (!name) return text;
  return text.split(`<!-- variant:${name} -->`)[1]?.split(/<!-- variant:[^>]+ -->/u)[0] ?? "";
}

// `Map<"<kind>:<id>", Map<runtime, string[]>>` — each member's raw texts by runtime key.
function memberTexts(descriptor, readText) {
  const read = (member, file, name) => section(readText(member.assetClass ?? "bundle", file), name);
  const members = new Map();
  for (const member of descriptor.members.filter((entry) => ["agent", "command", "skill"].includes(entry.kind))) {
    const texts = new Map([[COMMON, [read(member, member.file)]]]);
    for (const [runtime, variant] of Object.entries(member.variants ?? {})) {
      if (variant === null) continue;
      texts.set(runtime, [read(member, variant.file, variant.section), ...(variant.associatedFiles ?? []).map((attachment) => read(member, attachment.file, attachment.section))]);
    }
    members.set(`${member.kind}:${member.id}`, texts);
  }
  return members;
}

const carriers = (texts, slot) => [...texts].filter(([, list]) => list.some((text) => slotsOf(text).includes(slot))).map(([runtime]) => runtime);

// Each gap, named by fragment, runtime and slot.
export function landingGaps({ descriptor, readText }) {
  const members = memberTexts(descriptor, readText);
  const practices = new Set((descriptor.practices ?? []).map((practice) => practice.id));
  const fragments = descriptor.members.filter((member) => member.kind === "fragment");
  const gaps = [];
  for (const fragment of fragments) {
    const texts = members.get(fragment.target);
    const bodies = new Set([...(fragment.file ? [COMMON] : []), ...Object.keys(fragment.variants ?? {})]);
    if (!practices.has(fragment.practice)) gaps.push({ fragment: fragment.id, runtime: "-", slot: fragment.slot, why: `its practice "${fragment.practice}" is not declared` });
    if (!texts) {
      gaps.push({ fragment: fragment.id, runtime: "-", slot: fragment.slot, why: `its target "${fragment.target}" is not declared` });
      continue;
    }
    const carrying = carriers(texts, fragment.slot);
    if (carrying.length === 0) gaps.push({ fragment: fragment.id, runtime: "-", slot: fragment.slot, why: `no text of ${fragment.target} carries the slot` });
    for (const runtime of carrying) if (!bodies.has(runtime)) gaps.push({ fragment: fragment.id, runtime, slot: fragment.slot, why: `the ${runtime} text carries the slot and the fragment has no ${runtime} body` });
  }
  for (const [target, texts] of members) {
    const common = new Set((texts.get(COMMON) ?? []).flatMap(slotsOf));
    for (const [runtime, list] of texts) {
      if (runtime === COMMON) continue;
      const carried = new Set(list.flatMap(slotsOf));
      for (const slot of common) {
        if (carried.has(slot)) continue;
        const named = fragments.filter((fragment) => fragment.target === target && fragment.slot === slot).map((fragment) => fragment.id);
        gaps.push({ fragment: named.join(", ") || `(${target})`, runtime, slot, why: `${target} carries the slot in its common source and not in its ${runtime} text` });
      }
    }
  }
  return gaps;
}

const describe = (gaps) => gaps.map(({ fragment, runtime, slot, why }) => `fragment ${fragment}, runtime ${runtime}, slot ${slot}: ${why}`).join("; ");
const assertLands = (gaps, what) => assert.deepEqual(gaps, [], `${what}: ${describe(gaps)}`);

const shipped = () => ({ descriptor: readDescriptor(), readText: readAssetText });
const fixture = (files = BASE_FILES, mutate = () => {}) => {
  const load = baseFixture({ files: { ...files } });
  const descriptor = load.descriptor();
  mutate(descriptor);
  return { descriptor, readText: load.readText };
};

export const archTests = [
  {
    name: "arch/192 FF-19206: every shipped fragment names a declared practice, member and carried slot, with a body for each runtime that carries it",
    run: () => assertLands(landingGaps(shipped()), "the shipped bundle"),
  },
  {
    name: "arch/192 FF-19206: the same checks hold over a fixture bundle that declares fragments, so the control is never empty",
    run: () => {
      const subject = fixture();
      assert.ok(subject.descriptor.members.some((member) => member.kind === "fragment"), "the fixture declares fragments");
      assertLands(landingGaps(subject), "the fixture bundle");
    },
  },
  ...[
    ["a slot added to a common source and not to its Codex procedure",
      () => fixture({ ...BASE_FILES, "commands/demo.md": BASE_FILES["commands/demo.md"].replace("After.", "After.\n\n<!-- slot:demo.extra -->") }, (descriptor) => {
        descriptor.members.push({ id: "notes-extra", kind: "fragment", practice: "notes", target: "command:demo", slot: "demo.extra", file: "fragments/notes/demo.md", assetClass: "package:@aof/fixture-first" });
      }), { fragment: "notes-extra", runtime: "codex", slot: "demo.extra" }],
    ["a fragment with a common body and no Codex body, for a slot Codex carries",
      () => fixture(BASE_FILES, (descriptor) => { delete descriptor.members.find((member) => member.id === "notes-demo").variants; }), { fragment: "notes-demo", runtime: "codex", slot: "demo.notes" }],
    ["a fragment whose slot no text of its target carries",
      () => fixture(BASE_FILES, (descriptor) => { descriptor.members.find((member) => member.id === "notes-demo").slot = "demo.ghost"; }), { fragment: "notes-demo", runtime: "-", slot: "demo.ghost" }],
  ].map(([planted, subject, expected]) => ({
    name: `arch/192 FF-19206 planted: ${planted} turns the control red`,
    run: () => {
      const gaps = landingGaps(subject());
      assert.ok(gaps.some((gap) => gap.fragment.includes(expected.fragment) && gap.runtime === expected.runtime && gap.slot === expected.slot), `the control names the fragment, the runtime and the slot: ${describe(gaps)}`);
      assert.throws(() => assertLands(gaps, "planted"), (error) => [expected.fragment, expected.slot].every((name) => error.message.includes(name)));
    },
  })),
];
