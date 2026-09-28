// Fitness function for story 30 / task 01 (the bundle SOURCE surface).
//
// The task feature flagged two STRUCTURAL invariants as arch-tests (NOT Thens):
//   (1) every one of the 8 frozen ACD roles declares a `model` in the bundle
//       SOURCE (`src/bundle/agents/*.md` frontmatter) — no role un-mapped;
//   (2) the declared SOURCE value is a family alias (lowercase `opus`/`sonnet`),
//       never a dated/fully-pinned id (e.g. anything shaped like `claude-…-N-N`).
//
// These check the bundle SOURCE frontmatter — a DISTINCT surface from the
// rendered `.claude/agents/<role>.md` file the behavioural test in
// test/bundle/bundle-model-map.test.mjs asserts. Do not collapse the two: the render
// pass could in principle drop or reshape the value, so the source is pinned
// here on its own. The frozen 8-role set is fixed by the descriptor
// (readDescriptor), so this test derives the role set live rather than
// re-hardcoding it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDescriptor, bundleRoot } from "../../../src/work/bundle.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SESSION_MODEL_SOURCE = path.join(root, "src", "session-model.mjs");
const BUNDLE_SOURCE = path.join(root, "src", "work", "bundle.mjs");

// The two moving family aliases the bundle is allowed to ship. Lowercase and
// un-hyphenated — the "moving alias, not a pinned id" contract (STORY.md).
const ALLOWED_ALIASES = new Set(["opus", "sonnet"]);

// Read the single-line `model:` frontmatter value from a bundle agent SOURCE
// file, or null when absent. Reads ONLY the leading `---`…`---` block so a body
// mention cannot false-match. Mirrors the bundle's own single-line frontmatter
// contract (splitFrontmatter in src/work/bundle.mjs).
function sourceModelValue(role) {
  const member = readDescriptor().members.find((m) => m.id === role && m.kind === "agent");
  assert.ok(member, `descriptor declares agent member ${role}`);
  const raw = readFileSync(path.join(bundleRoot(), member.file), "utf8").replace(/^﻿/, "");
  const end = raw.indexOf("\n---", 3);
  const block = end === -1 ? raw : raw.slice(0, end);
  const match = /^model:[ \t]?(.*)$/m.exec(block);
  return match ? match[1].trim() : null;
}

// The frozen 8 ACD agent ids, DERIVED from the descriptor at test time (no 4th
// hardcoded copy of the list — the descriptor is the single source of truth).
function acdAgentIds() {
  return readDescriptor()
    .members.filter((m) => m.kind === "agent")
    .map((m) => m.id);
}

export const archTests = [
  {
    name: "arch/story-30: every frozen ACD role declares a model in the bundle SOURCE frontmatter (no role un-mapped)",
    run: async () => {
      const roles = acdAgentIds();
      assert.equal(roles.length, 8, "the descriptor declares exactly the 8 frozen ACD agents");
      for (const role of roles) {
        const value = sourceModelValue(role);
        assert.ok(
          value !== null && value !== "",
          `bundle source ${role}.md declares a non-empty model frontmatter line`
        );
      }
    }
  },
  {
    name: "arch/story-30: the bundle SOURCE model value is a lowercase family alias, never a dated/pinned id",
    run: async () => {
      for (const role of acdAgentIds()) {
        const value = sourceModelValue(role);
        assert.ok(value !== null, `${role} declares a model value`);

        // A family alias — one of the two moving aliases, matched exactly.
        assert.ok(
          ALLOWED_ALIASES.has(value),
          `${role} source model "${value}" is a family alias (one of: ${[...ALLOWED_ALIASES].sort().join(", ")})`
        );

        // Never re-cased: byte-identical to its own lowercase form (rules out
        // "Opus" / "OPUS" — a downstream literal match depends on the exact case).
        assert.equal(value, value.toLowerCase(), `${role} source model "${value}" is not re-cased`);

        // Never a version-dated / fully-pinned id. Reject a `claude-…-N-N` shape
        // (e.g. "claude-opus-4-8"): no digits, no hyphens in a bare alias.
        assert.ok(
          !/^claude-.*\d+-\d+/.test(value),
          `${role} source model "${value}" is not a version-dated id (claude-…-N-N)`
        );
        assert.ok(!/\d/.test(value), `${role} source model "${value}" carries no version digit`);
        assert.ok(!value.includes("-"), `${role} source model "${value}" is a bare alias, not a hyphenated id`);
      }
    }
  },
  // milestone 70 / story 01 (ADR-005) — FF-7006: TWO model surfaces, never conflated.
  // The render-time ROLE model resolves from `work.agents.models`; the SESSION model
  // resolves from its own distinct config path (`work.agents.session`). Neither
  // resolver reads the other's path, and no module derives one from the other.
  {
    name: "arch/70 FF-7006 (acd-agent-model-source-map, extended): the role model resolves from work.agents.models and the session model from work.agents.session — neither resolver reads the other's path",
    run: async () => {
      const sessionCode = stripComments(readFileSync(SESSION_MODEL_SOURCE, "utf8"));
      const bundleCode = stripComments(readFileSync(BUNDLE_SOURCE, "utf8"));

      // The session resolver reads the session path.
      assert.match(sessionCode, /work\.agents\.session/, "the session resolver reads work.agents.session (its own distinct path)");
      // The session resolver NEVER reads the role path.
      assert.doesNotMatch(sessionCode, /work\.agents\.models/, "the session resolver never reads work.agents.models (the role surface)");

      // The role-model resolver (work-bundle.mjs) reads the role path.
      assert.match(bundleCode, /work\.agents\.models/, "the role-model resolver reads work.agents.models (its own path)");
      // The role-model resolver NEVER reads the session path.
      assert.doesNotMatch(bundleCode, /work\.agents\.session/, "the role-model resolver never reads work.agents.session (the session surface)");

      // Red probe 1: point the session resolver at the role path → it trips.
      const plantedSession = sessionCode.replace(/work\.agents\.session/g, "work.agents.models");
      assert.notEqual(plantedSession, sessionCode, "the session-path plant actually changed the source text");
      assert.match(plantedSession, /work\.agents\.models/, "a session resolver that reads the role path trips the session-surface assertion");

      // Red probe 2: the role-model resolver starts reading the session path → it trips.
      const plantedBundle = bundleCode.replace(/work\.agents\.models/g, "work.agents.session");
      assert.notEqual(plantedBundle, bundleCode, "the role-path plant actually changed the source text");
      assert.match(plantedBundle, /work\.agents\.session/, "a role resolver that reads the session path trips the role-surface assertion");
    },
  },
  // story 141 — FF-7006 grows to hold for EFFORT both ways. The role effort map
  // `work.agents.effort` is the model map's twin on the role path; the session effort stays on
  // `work.agents.session`. The session resolver reads neither role map, and the bundle reads the
  // role effort map and never the session path. Sharing the effort VOCABULARY (an import of
  // `normalizeEffort`) is not reading another surface's path, so it is not what this guards.
  {
    name: "arch/141 FF-7006 (extended): the session resolver never reads work.agents.effort or work.agents.models, and the bundle reads work.agents.effort and never work.agents.session",
    run: async () => {
      const sessionCode = stripComments(readFileSync(SESSION_MODEL_SOURCE, "utf8"));
      const bundleCode = stripComments(readFileSync(BUNDLE_SOURCE, "utf8"));
      const readsRoleMaps = (code) => /work\.agents\.(?:effort|models)\b/u.test(code) || /agents\?\.(?:effort|models)\b/u.test(code);
      const readsSession = (code) => /work\.agents\.session\b/u.test(code) || /agents\?\.session\b/u.test(code);

      assert.equal(readsRoleMaps(sessionCode), false, "the session resolver never reads work.agents.effort or work.agents.models");
      assert.match(bundleCode, /work\.agents\.effort/u, "the bundle reads work.agents.effort (the role effort path)");
      assert.equal(readsSession(bundleCode), false, "the bundle never reads work.agents.session");

      // Red probe 1: plant the role effort path in the session resolver → it trips.
      const plantedSession = `${sessionCode}\nconst planted = config?.work?.agents?.effort;\n`;
      assert.equal(readsRoleMaps(plantedSession), true, "a session resolver that reads work.agents.effort trips");
      assert.equal(readsRoleMaps(`${sessionCode}\nconst p = "work.agents.effort";\n`), true, "…spelled as a path constant too");

      // Red probe 2: plant the session path in the bundle → it trips.
      const plantedBundle = `${bundleCode}\nconst planted = projectConfig?.work?.agents?.session;\n`;
      assert.equal(readsSession(plantedBundle), true, "a bundle that reads work.agents.session trips");
      assert.equal(readsSession(`${bundleCode}\nconst p = "work.agents.session";\n`), true, "…spelled as a path constant too");
    },
  },
];
