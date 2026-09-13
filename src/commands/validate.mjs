// work:validate — the deterministic stream validator (ADR-002).
//
// `run` returns the `{ findings }` envelope SHAPE (the board's milestone-03
// envelope), each finding's `path` left a RAW ABSOLUTE in its on-disk OS form —
// NO displayPath, NO path.relative, NO slashing inside run (the ADR-002
// keystone). Path display is a FACE adapter: the board projects to projectRoot +
// forward-slash; the CLI `--json` projects to cwd (path.relative) AND unwraps to
// the bare `[{path,problem}]` array it has always emitted (the CLI's historical
// quirk, preserved by the adapter — the command result stays the richer envelope).
// An unresolved scope is a filter that matches nothing → empty findings, no error
// (validateWork's scope-as-filter semantics are preserved through the re-home).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { declaredAdrsInStory, extractAdrBlocks } from "../phase-brief.mjs";
import {
  namesBackslashPath,
  resolveStoryContractPath,
  storyAnchorResolves,
  storyContractList,
} from "../story-contract.mjs";
import { resolveCitedPath } from "../cited-path-resolve.mjs";
// The impure half of ADR-004's resolver, already exported so a command edge does not spell its
// own git read. THIS is the third reader the ADR did not enumerate (see the `reads:` probe).
import { readRenameMap } from "./doctor.mjs";
import { itemInScope } from "../work/ref-scope.mjs";
import { listItems, recordDoc, validateWork as validateCoreWork } from "../work.mjs";

// Milestone 70's optional ADR declaration is a validation concern, but src/work.mjs
// is byte-frozen by m53/FF-5308. Keep the additive check on this existing validation
// leaf: the core validator remains untouched, while every public validate command gets
// the same combined findings. The controls lane and its frozen m66 envelope stay out.
export async function validateWork(workDir, config, scopeRef, { projectRoot } = {}) {
  const findings = await validateCoreWork(workDir, config, scopeRef);
  // Read ONCE for the whole run and handed down as data: the map is derived from git history, so it
  // is the same answer for every story, and a per-story read would spawn git once per item.
  const renameMap = await readRenameMap(projectRoot ?? null);
  const items = await listItems(workDir);
  const milestones = items.filter((item) => item.type === "milestone" && item.dir != null);
  const architectureReads = new Map();

  const architectureFor = async (milestone) => {
    if (milestone == null) return null;
    if (!architectureReads.has(milestone.dir)) {
      architectureReads.set(
        milestone.dir,
        readFile(path.join(milestone.dir, "ARCHITECTURE.md"), "utf8").catch(() => null),
      );
    }
    return architectureReads.get(milestone.dir);
  };

  const resolvedProjectRoot = projectRoot ?? inferProjectRoot(workDir, config);

  // A story's HONEST FORWARD REFERENCE (62/R8). A stage-2 story composes modules a stage-1
  // sibling has not written yet, and naming them is the truest read contract it can author —
  // but the existence check called that a defect, so 62/04 dropped four `src/work-tune/*.mjs`
  // entries and stood sibling STORY.md paths in their place to reach PASS. A gate that makes
  // the honest declaration impossible teaches authors to under-declare, which is the very
  // failure the read contract exists to prevent.
  //
  // The exemption mirrors the one `files:` already has — "writes may name files the story has
  // not created yet" — and stops exactly where that reasoning does: the path must be CLAIMED,
  // by some story under the same milestone, in its own `files:`. A read of a path nobody will
  // create is still a finding, so the check keeps its teeth. The claim set is the milestone's
  // whole story set rather than the strict siblings, because a story's own declared write is
  // the strongest possible claim that the path will exist.
  //
  // Matching is case-SENSITIVE on the resolved project path. `ready-wave.mjs` lowercases its
  // collision key deliberately — over-detecting an overlap is the safe error there — but here
  // the same normalisation would let a wrong-case read borrow a claim and red on the Linux
  // worker, so the safe error runs the other way.
  const writeClaims = new Map();
  const declaredWriteClaims = (parent) => {
    if (parent == null) return Promise.resolve(new Set()); // a parentless story has no milestone set
    if (!writeClaims.has(parent)) {
      writeClaims.set(parent, (async () => {
        const claims = new Set();
        for (const sibling of items) {
          if (sibling.type !== "story" || sibling.dir == null || sibling.parent !== parent) continue;
          const doc = await readFile(path.join(sibling.dir, recordDoc(sibling)), "utf8").catch(() => null);
          if (doc == null) continue;
          const declaration = storyContractList(doc, "files");
          if (!declaration.present || declaration.malformed) continue;
          for (const entry of declaration.values) {
            if (namesBackslashPath(entry)) continue; // refused for that story on its own line
            const resolved = resolveStoryContractPath(entry, { storyDir: sibling.dir, projectRoot: resolvedProjectRoot });
            // An anchored write is that story's own finding, and names a section rather than a file.
            if (resolved != null && resolved.anchor == null) claims.add(resolved.projectPath);
          }
        }
        return claims;
      })());
    }
    return writeClaims.get(parent);
  };

  for (const item of items) {
    if (item.type !== "story" || item.dir == null || !itemInScope(item, scopeRef)) continue;
    const docPath = path.join(item.dir, recordDoc(item));
    const story = await readFile(docPath, "utf8").catch(() => null);
    if (story == null) continue; // the core validator owns missing record documents

    const declarations = new Map();
    for (const key of ["reads", "files"]) {
      const declaration = storyContractList(story, key);
      declarations.set(key, declaration);
      if (!declaration.present) continue; // continue owns the missing-reads stop; legacy records stay valid
      if (declaration.malformed) {
        findings.push({ path: docPath, problem: `story ${key} declaration must be an inline or block list` });
        continue;
      }
      for (const entry of declaration.values) {
        // Named before the resolver, because a backslash entry is refused for a reason
        // an operator can act on rather than the generic outside-the-project message.
        if (namesBackslashPath(entry)) {
          findings.push({
            path: docPath,
            problem: `story ${key} entry "${entry}" must use forward slashes so it resolves on every node`,
          });
          continue;
        }
        const resolved = resolveStoryContractPath(entry, { storyDir: item.dir, projectRoot: resolvedProjectRoot });
        if (resolved == null) {
          findings.push({ path: docPath, problem: `story ${key} entry "${entry}" must resolve inside the project` });
          continue;
        }
        if (key !== "reads") {
          // An anchor names a SECTION, and a story writes files. Left unsaid, a stray
          // anchor silently degrades the whole story to an unknown write set, which
          // holds every sibling behind it with nothing said about why.
          if (resolved.anchor != null) {
            findings.push({ path: docPath, problem: `story files entry "${entry}" must not name a section anchor` });
          }
          continue; // writes may name files the story has not created yet
        }
        const target = await readFile(resolved.absolutePath, "utf8").catch(() => null);
        if (target == null) {
          // ADR-004: a cited path resolves if it exists at HEAD **or** if the repository's own
          // history records a rename from it. A story that read a module somebody later moved
          // has not become malformed, and a DELIVERED story's record cannot be edited to say
          // otherwise — which is the whole reason the resolver exists.
          if (resolveCitedPath(resolved.projectPath, { renameMap }).resolved) continue;
          // Clean, not a warning naming the claimant: the findings envelope carries no severity
          // channel, so a warning would still be a finding, still red the gate ladder, and still
          // teach the author to drop the entry. 62/R8 left that choice open; this is it.
          if ((await declaredWriteClaims(item.parent)).has(resolved.projectPath)) continue;
          findings.push({ path: docPath, problem: `story reads path "${entry}" does not exist` });
        } else if (resolved.anchor != null && !storyAnchorResolves(target, resolved.anchor)) {
          findings.push({ path: docPath, problem: `story reads anchor "${entry}" does not resolve` });
        }
      }
    }

    // BOTH SETS PRESENT AND EMPTY IS THE TEMPLATE'S OWN SIGNATURE, never an authored
    // contract: the scaffold ships `reads: []` + `files: []` for refine to replace.
    // Absence stays valid (221 stories predate the field); an untouched scaffold does
    // not, because it passes continue's missing-reads stop while declaring nothing.
    const scaffolded = ["reads", "files"].every((key) => {
      const declaration = declarations.get(key);
      return declaration?.present === true && declaration.malformed === false && declaration.values.length === 0;
    });
    if (scaffolded) {
      findings.push({
        path: docPath,
        problem: "story declares neither reads nor files — run `aof:refine` to author the context contract",
      });
    }

    const declaration = declaredAdrsInStory(story);
    if (declaration.malformed) {
      findings.push({
        path: docPath,
        problem: "ADR declaration `adrs` must be an inline list (for example: adrs: [ADR-001])",
      });
      continue;
    }
    if (declaration.ids.length === 0) continue;

    // Folder containment selects the story's OWN milestone; a standalone story can
    // never borrow an identically-named ADR from another item.
    const owner = milestones.find((milestone) => item.dir.startsWith(`${milestone.dir}${path.sep}stories${path.sep}`));
    const architecture = await architectureFor(owner);
    const missing = typeof architecture === "string"
      ? extractAdrBlocks(architecture, declaration.ids).missing
      : declaration.ids;
    for (const id of missing) {
      findings.push({
        path: docPath,
        problem: owner == null
          ? `ADR declaration "${id}" does not resolve: story ${item.ref} has no parent milestone architecture`
          : `ADR declaration "${id}" does not resolve in ${owner.ref}/ARCHITECTURE.md`,
      });
    }
  }

  // A SCOPE THAT MATCHED NOTHING IS NOT A PASS (TECH_DEBT item 11, paid 2026-09-05).
  // `validateWork`'s scope is a FILTER, and that stays true — the filter semantics are
  // deliberate and shared with doctor and memory through `work-ref-scope.mjs`. What was
  // wrong is what an EMPTY match rendered as: `aof work validate 999` returned zero
  // findings and the CLI printed `PASS — 999 is well-formed.` with exit 0, so a typo'd
  // ref, or a ref whose folder has not been scaffolded yet, reported the stream healthy.
  // In an `--autonomous` cascade — which runs validate as a gate between steps and reads
  // its exit code — a mistyped scope was indistinguishable from a green gate.
  //
  // It is a FINDING rather than a throw so the `{ findings }` envelope shape is unchanged
  // and every face (board, `--json`, human) reports it through the path it already has.
  // The membership test is `itemInScope`, the same rule the core validator filters with,
  // so the two can never disagree about what a scope resolves to.
  const scope = scopeRef == null ? "" : String(scopeRef).trim();
  if (scope !== "" && !items.some((item) => itemInScope(item, scope))) {
    findings.push({
      path: workDir,
      problem: `scope-not-found: "${scope}" resolves to no work item — nothing was validated, so this is not a pass`,
    });
  }
  return findings;
}

export const validateCommand = {
  id: "work:validate",
  input: {
    type: "object",
    properties: { scope: { type: "string" } },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const scope = scopeOf(input);
    const findings = await validateWork(ctx.workspace.workDir, ctx.workspace.config, scope, {
      projectRoot: ctx.workspace.projectRoot,
    });
    // Raw absolute paths, OS-native, NO projection — the face relativises.
    return { findings: findings.map((finding) => ({ path: finding.path, problem: finding.problem })) };
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs face copy is deleted. The findings gate
    // (any finding → exit 1, --json included) rides the cli.exit adapter.
    route: ["work", "validate"],
    spec: {
      usage: "aof work validate [scope] [--json]",
      flags: {},
    },

    // `aof work validate [scope]` — an optional positional maps onto the input.
    argv: (positionals) => (positionals[0] ? { scope: positionals[0] } : {}),

    // Reproduces today's `aof work validate` human output byte-for-byte: the PASS
    // line (scope-aware) on a clean stream; otherwise the numbered
    // issue list with cwd-relative paths and the trailing test-traceability note.
    render(result, faceCtx = {}) {
      const scope = faceCtx.positionals?.[0];
      if (result.findings.length === 0) {
        return `PASS — ${scope ? `${scope} is` : "work stream is"} well-formed.`;
      }
      const lines = result.findings.map(
        (finding) => `  ${path.relative(process.cwd(), finding.path)} — ${finding.problem}`
      );
      return [
        `${result.findings.length} issue(s):`,
        ...lines,
        "\nNote: test-traceability (@executable → green test; @manual/@uat → VERIFICATION rows) is not yet checked here.",
      ].join("\n");
    },

    // The CLI's historical `--json` is the BARE array (cli.mjs:586), not the
    // envelope: unwrap `{findings}` and relativise each path to cwd (OS separators).
    json: (result) =>
      result.findings.map((finding) => ({
        path: path.relative(process.cwd(), finding.path),
        problem: finding.problem,
      })),

    // A non-empty findings list is a non-zero exit — today's CLI behaviour,
    // --json included.
    exit: (result) => (result.findings.length > 0 ? 1 : 0),
  },
};

function scopeOf(input) {
  const scope = typeof input?.scope === "string" ? input.scope.trim() : "";
  return scope === "" ? undefined : scope;
}

function inferProjectRoot(workDir, config) {
  const configured = config?.work?.dir;
  if (typeof configured !== "string" || configured.trim() === "" || path.isAbsolute(configured)) {
    return path.resolve(workDir, "..", "..");
  }
  const segments = path.normalize(configured).split(path.sep).filter((part) => part !== "." && part !== "");
  if (segments.includes("..")) return path.resolve(workDir, "..", "..");
  return path.resolve(workDir, ...segments.map(() => ".."));
}
