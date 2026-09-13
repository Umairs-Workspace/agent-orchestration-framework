// FF-5313 — delivered loop records are immutable framework-owned asset members.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readLock } from "../../../src/lock.mjs";
import {
  ADMITTED_KEYS,
  ENDPOINT_SCHEMES,
  NODE_KINDS,
  POINTER_SCHEMES,
  loadLoops,
} from "../../../src/work/loops.mjs";
import { loadBundle, renderBundleOutputs } from "../../../src/work/bundle.mjs";
import { readShippedManifest } from "../../../src/work/bundle-manifest.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const descriptor = JSON.parse(await readFile(path.join(root, "src", "bundle", "bundle.json"), "utf8"));
const loopMembers = descriptor.members.filter((member) => member.target?.startsWith(".aof/loops/"));

export const archTests = [
  {
    name: "arch/53 FF-5313: framework registry records are verbatim assets for both runtimes",
    run: async () => {
      assert.ok(loopMembers.length >= 9);
      for (const member of loopMembers) {
        assert.equal(member.kind, "asset", `${member.id}: asset`);
        assert.equal(member.file, `loops/${path.basename(member.target)}`);
        assert.deepEqual(member.runtimes, ["claude", "codex"]);
        assert.equal(Object.hasOwn(member, "body"), false);
      }

      const bundle = loadBundle();
      const claude = renderBundleOutputs(bundle, { runtimes: ["claude"] });
      const codex = renderBundleOutputs(bundle, { runtimes: ["codex"] });
      for (const member of loopMembers) {
        const source = await readFile(path.join(root, "src", "bundle", member.file), "utf8");
        const claudeOutput = claude.find((output) => output.path === member.target);
        const codexOutput = codex.find((output) => output.path === member.target);
        assert.ok(claudeOutput && codexOutput, `${member.id}: emitted for both runtimes`);
        assert.equal(claudeOutput.content, source);
        assert.equal(codexOutput.content, source);
        assert.match(source, /^---\r?\n/, `${member.id}: frontmatter is first`);
        assert.equal(source.startsWith("<!-- aof-generated: bundle -->"), false, `${member.id}: no template stamp`);
        assert.match(source, new RegExp(`src/bundle/loops/${path.basename(member.file).replace(".", "\\.")}`));
        assert.match(source, /installed by `aof work update`/);
        assert.match(source, /\.aof\/aof\.config\.json/);
      }
    },
  },
  {
    // EXTENDS a guard already in service rather than adding a sibling, on the same subject the host
    // asserts (delivered loop records are framework-owned asset members). Landed at 57/05's verify
    // for F-57-05-1: the three watcher records shipped in `src/bundle/loops/` and were never
    // installed into aof's OWN `.aof/loops/`, so the framework kept declaring a pairing rule its own
    // registry did not satisfy. Nothing caught it — the host asserts bundle→RENDER parity, and the
    // behavioural install scenario installs into a TEMP repo, so it proves the path works and cannot
    // see that the path was never walked here. `.gitattributes` already pins `.aof/loops/*.md` to LF
    // "byte-compared with their LF-pinned bundle source" — this is the comparison that pin was for.
    name: "arch/53 FF-5313: every delivered loop record is installed in aof's own registry, byte-identical",
    run: async () => {
      assert.ok(loopMembers.length >= 9, `non-vacuous: ${loopMembers.length} loop members`);
      const missing = [];
      const drifted = [];
      for (const member of loopMembers) {
        const source = await readFile(path.join(root, "src", "bundle", member.file));
        let installed;
        try {
          installed = await readFile(path.join(root, member.target));
        } catch {
          missing.push(member.target);
          continue;
        }
        if (!installed.equals(source)) drifted.push(member.target);
      }
      assert.deepEqual(missing, [], "every shipped loop record is installed in .aof/loops/");
      assert.deepEqual(drifted, [], "every installed loop record is byte-identical to its bundle source");
    },
  },
  {
    name: "arch/53 FF-5313: stamped counter-control fails while every asset record loads",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-registry-asset-"));
      try {
        const loopsDir = path.join(temp, "loops");
        await mkdir(loopsDir);
        const source = await readFile(path.join(root, "src", "bundle", loopMembers[0].file), "utf8");
        await writeFile(path.join(loopsDir, "stamped.md"), `<!-- aof-generated: bundle -->\n\n${source}`);
        const negative = await loadLoops(temp);
        assert.equal(negative.nodes.length, 0);
        assert.deepEqual(negative.findings.map((finding) => [finding.code, finding.severity]), [["loop-record-unparseable", "error"]]);

        await rm(loopsDir, { recursive: true, force: true });
        await mkdir(loopsDir);
        for (const member of loopMembers) {
          await writeFile(path.join(loopsDir, path.basename(member.file)), await readFile(path.join(root, "src", "bundle", member.file), "utf8"));
        }
        const positive = await loadLoops(temp);
        assert.equal(positive.nodes.length, loopMembers.length);
        assert.equal(positive.findings.some((finding) => finding.severity === "error"), false);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/53 FF-5313: vocabulary stays closed and config remains outside delivery",
    run: async () => {
      assert.deepEqual([...NODE_KINDS], ["loop", "actor", "anchor", "watcher", "arbiter", "auditor"]);
      assert.deepEqual([...POINTER_SCHEMES], ["module", "command", "config"]);
      assert.deepEqual([...ENDPOINT_SCHEMES], ["loop", "actor", "item", "command", "config", "module", "arbiter"]);
      for (const forbidden of ["provenance", "origin", "source", "scope", "framework"]) {
        assert.equal(ADMITTED_KEYS.all.has(forbidden), false, `${forbidden}: not admitted`);
      }
      assert.equal(readShippedManifest().entries.some((entry) => entry.path === ".aof/aof.config.json"), false);
      const lock = await readLock(path.join(root, ".aof", "aof.lock.json"));
      assert.equal(lock?.work?.files?.some((entry) => entry.path === ".aof/aof.config.json"), false);
    },
  },
];
