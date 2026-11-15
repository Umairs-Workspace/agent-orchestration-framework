// FF-19205 — a slot leaves nothing behind (milestone 192 / story 00, ADR-001 §3, §4).
//
// Covers the FF-19205 scenarios of
//   tasks/00_a-slot-holds-what-is-on-and-leaves-nothing-behind.feature
//
// No text `loadBundle` returns, and no rendered file, holds a slot marker, for an empty config and
// for a config with every declared practice on. Composing a source with every practice off equals
// that source with each marker line removed and the blank line above a block slot removed. The
// reference strip below is written here, independently of `bundle-compose.mjs`, so a composition
// that drifts from the rule is caught rather than agreed with. Every check runs over the shipped
// bundle AND 192/00's fixture bundle, so it is never vacuous while no shipped source has a slot.
import assert from "node:assert/strict";
import { readAssetText } from "../../../packages/core/src/asset-base.mjs";
import { loadBundle, readDescriptor, renderBundleOutputs } from "../../../packages/core/src/work/bundle.mjs";
import { composeText } from "../../../packages/core/src/work/bundle-compose.mjs";
import { BASE_FILES, baseFixture, practiceOn } from "../../../packages/core/test/bundle-compose.suite.mjs";

const MARKER = "<!-- slot:";
const RUNTIMES = ["claude", "codex", "opencode"];

// Each `{ member, text }` of a loaded bundle that still holds a marker.
export function markerLeaks(bundle) {
  const leaks = [];
  for (const resource of bundle.resources) {
    const member = `${resource.kind}:${resource.id}`;
    if (resource.body.includes(MARKER)) leaks.push({ member, text: "common body" });
    for (const [runtime, variant] of Object.entries(resource.runtimeVariants ?? {})) {
      if (variant.body?.includes(MARKER)) leaks.push({ member, text: `${runtime} body` });
      for (const attachment of variant.associatedFiles ?? []) if (attachment.content.includes(MARKER)) leaks.push({ member, text: `${runtime} ${attachment.path}` });
    }
  }
  return leaks;
}

// Each rendered file that holds a marker.
export function renderedLeaks(bundle) {
  return renderBundleOutputs({ ...bundle, templates: [], assets: [] }, { runtimes: RUNTIMES })
    .filter((output) => output.content.includes(MARKER))
    .map((output) => ({ member: `${output.resource.kind}:${output.resource.id}`, text: output.path.replaceAll("\\", "/") }));
}

// The rule, written out: drop each marker line, and the blank line above a block slot.
export function stripSlots(text) {
  const lines = text.split("\n");
  const out = [];
  lines.forEach((line, index) => {
    if (!/^ *<!-- slot:[a-z][a-z0-9]*(?:[.-][a-z][a-z0-9]*)* -->\r?$/u.test(line)) return void out.push(line);
    if (index > 0 && lines[index - 1].trim() === "") out.pop();
  });
  return out.join("\n");
}

// Each `{ member, text }` whose all-off composition differs from the rule.
export function compositionMismatches(sources, compose = (text) => composeText(text)) {
  return sources.filter(({ source }) => compose(source) !== stripSlots(source)).map(({ member, text }) => ({ member, text }));
}

const describe = (leaks) => leaks.map(({ member, text }) => `${member} (${text})`).join(", ");
const assertNone = (leaks, what) => assert.deepEqual(leaks, [], `${what}: ${describe(leaks)}`);

// The sources a composition reads: every shipped member file, and the fixture's.
function shippedSources() {
  return readDescriptor().members.filter((member) => ["agent", "command", "skill"].includes(member.kind))
    .map((member) => ({ member: `${member.kind}:${member.id}`, text: member.file, source: readAssetText(member.assetClass ?? "bundle", member.file) }));
}
const fixtureSources = () => Object.entries(BASE_FILES).filter(([file]) => !file.startsWith("fragments/")).map(([file, source]) => ({ member: "fixture", text: file, source }));

function bundlesUnderTest() {
  const shipped = loadBundle();
  const fixture = baseFixture();
  const fixturePractices = fixture.load().practices;
  return [
    ["the shipped bundle, empty config", shipped],
    ["the shipped bundle, every practice on", loadBundle({ config: practiceOn(shipped.practices) })],
    ["the fixture bundle, empty config", fixture.load({})],
    ["the fixture bundle, every practice on", fixture.load(practiceOn(fixturePractices))],
  ];
}

export const archTests = [
  {
    name: "arch/192 FF-19205: no text the loader returns holds a slot marker, for an empty config and with every practice on",
    run: () => {
      for (const [label, bundle] of bundlesUnderTest()) assertNone(markerLeaks(bundle), `${label} leaks a marker`);
    },
  },
  {
    name: "arch/192 FF-19205: no rendered file holds a slot marker, for the same two configs",
    run: () => {
      for (const [label, bundle] of bundlesUnderTest()) assertNone(renderedLeaks(bundle), `${label} renders a marker`);
    },
  },
  {
    name: "arch/192 FF-19205: composing each source with every practice off equals it with each marker line, and the blank line above a block slot, removed",
    run: () => {
      const fixture = fixtureSources();
      assert.ok(fixture.some(({ source }) => source.includes(MARKER)), "the fixture carries slots, so the check is not vacuous");
      assertNone(compositionMismatches([...shippedSources(), ...fixture]), "an all-off composition differs from the rule");
    },
  },
  ...[
    ["a reader that returns a member's source without composing it", () => {
      const bundle = baseFixture().load();
      const demo = bundle.resources.find((resource) => resource.id === "demo");
      demo.body = BASE_FILES["commands/demo.md"].split("---\n").slice(2).join("---\n");
      return markerLeaks(bundle);
    }],
    ["a composition that leaves the marker line when no fragment is on", () => compositionMismatches(fixtureSources(), (text) => text)],
    ["a composition that leaves the blank line above an empty block slot", () => compositionMismatches(fixtureSources(), (text) => text.split("\n").filter((line) => !line.includes(MARKER)).join("\n"))],
  ].map(([planted, findings]) => ({
    name: `arch/192 FF-19205 planted: ${planted} turns the control red`,
    run: () => {
      const found = findings();
      assert.ok(found.length > 0, "the control fails");
      assert.ok(found.every(({ member, text }) => member && text), "and names the member and the text that still holds a marker");
      assert.throws(() => assertNone(found, "planted"), (error) => error.message.includes(found[0].member) && error.message.includes(found[0].text));
    },
  })),
];
