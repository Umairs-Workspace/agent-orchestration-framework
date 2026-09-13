// work:counters — read-only observation boundary for 57/04's deterministic
// escape and intervention counters. Filesystem-backed records are read here;
// src/work/counters.mjs receives plain observations and performs no I/O.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 57 / story 04 — deterministic finding-escape and intervention
//   counters over feedback and run records. The command owns the read-only
//   observation edge; src/work/counters.mjs is arithmetic over injected records.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { commandError } from "../command-error.mjs";
import { readFeedbackRecords } from "../feedback-records.mjs";
import { isRetryable, readRuns } from "../run-store.mjs";
import { computeWorkCounters } from "../work/counters.mjs";
import { listItems, parseFrontmatter, recordDoc } from "../work.mjs";
import { resolveItem } from "./resolve.mjs";
// The attempt ceiling is READ here, never resolved here. 53/FF-5310 and 69/FF-6901
// hold `work.autonomous.maxAttempts` to four resolution sites, and spelling the key
// with a default anywhere else opens a fifth home for the bound — which is what this
// module did until `F-57-M-1`. Importing the resolver keeps the classification this
// counter makes and the ceiling a retry actually spends on the same number, by
// construction rather than by two modules agreeing.
import { resolveAttemptCeiling } from "./run-retry.mjs";

async function itemObservation(item) {
  const doc = recordDoc(item);
  let meta = {};
  if (doc != null) {
    try {
      meta = parseFrontmatter(await readFile(path.join(item.dir, doc), "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return {
    ref: item.ref,
    status: meta.status ?? null,
    acceptedAt: meta.status === "done" ? meta.updated ?? null : null,
    feedbackRecords: await readFeedbackRecords(item),
    runs: await readRuns(item),
  };
}

function withinScope(item, target) {
  if (item.ref === target.ref) return true;
  return target.parent == null && item.parent === target.ref;
}

export async function observeCounters(workspace, target) {
  const localItems = (await listItems(workspace.workDir)).filter((item) => withinScope(item, target));
  return await Promise.all(localItems.map(itemObservation));
}

function renderCounter(counter, noun, denominator) {
  if (counter.status === "unmeasurable") {
    return `${noun}: cannot measure (${counter.reason}; ${counter.unmeasuredItems} item(s) unmeasured)`;
  }
  const basis = denominator == null ? "" : ` across ${counter[denominator]} ${denominator}`;
  const partial = counter.unmeasuredItems > 0 ? `; ${counter.unmeasuredItems} item(s) unmeasured` : "";
  return `${noun}: ${counter.count}${basis}${partial}`;
}

export const countersCommand = {
  id: "work:counters",
  input: {
    type: "object",
    properties: { ref: { type: "string" } },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);
    const target = await resolveItem(ctx, ref);
    if (target == null) throw commandError(`No work item matches "${ref}".`, "ref-not-found", 404);
    if (typeof target.dir !== "string" || target.dir === "") {
      throw commandError(`Counter records for "${target.ref}" are not present in this checkout.`, "counter-data-not-local", 409);
    }

    const observations = ctx.observeCounters
      ? await ctx.observeCounters(ctx.workspace, target)
      : await observeCounters(ctx.workspace, target);
    const maxAttempts = resolveAttemptCeiling(ctx.workspace.config);
    return {
      ref: target.ref,
      ...computeWorkCounters(observations, { maxAttempts, isRetryableReason: isRetryable }),
    };
  },

  cli: {
    route: ["work", "counters"],
    spec: {
      usage: "aof work counters <ref> [--json]",
      flags: {},
    },
    argv(positionals) {
      if (!positionals[0]) throw commandError("Usage: aof work counters <ref> [--json]", "invalid-input", 400);
      return { ref: positionals[0] };
    },
    render(result) {
      return [
        `Loop counter-metrics for ${result.ref}:`,
        `  ${renderCounter(result.escape, "finding escapes", "feedbackRecords")}`,
        `  ${renderCounter(result.intervention, "interventions", "runs")}`,
      ].join("\n");
    },
    json: (result) => result,
  },
};
