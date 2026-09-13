// The Loop-Ready score is a pure projection over facts gathered at work:doctor's
// command boundary. It deliberately reads no filesystem, clock, registry module,
// or process state. Milestone 53 / ADR-007 and ADR-010.
import { inScope } from "./doctor.mjs";

const BASE_CHECK_IDS = Object.freeze([
  "stream-coherent",
  "cap-declared",
  "memory-on",
  "tasks-authored",
]);

export const COMPOSED_CHECK_IDS = Object.freeze([
  "grounding",
  "anchor-grounding",
  "pairing",
  "reference-ownership",
  "actuator-arbitration",
  "timescale",
]);

const FALLBACK_MAX_ATTEMPTS = 3;

function printable(value) {
  if (value === undefined) return "absent";
  const encoded = JSON.stringify(value);
  return encoded === undefined ? String(value) : encoded;
}

function baseChecks({ findings, config, snapshot, scope }) {
  const errors = findings.filter((finding) => finding.severity === "error").length;

  const declaredCap = config?.work?.autonomous?.maxAttempts;
  const capPasses = Number.isInteger(declaredCap) && declaredCap >= 0;

  const memoryBlock = config?.memory;
  const declaredBackend = memoryBlock != null && typeof memoryBlock === "object" && !Array.isArray(memoryBlock)
    ? memoryBlock.backend
    : undefined;
  const resolvedBackend = typeof declaredBackend === "string" ? declaredBackend : "none";
  const memoryPasses = resolvedBackend !== "" && resolvedBackend !== "none";

  const stories = snapshot.items.filter((item) => item.type === "story" && inScope(item, scope));
  const authored = stories.filter((item) => item.hasTasks === true);
  const missing = stories.filter((item) => item.hasTasks !== true).map((item) => item.ref);

  return [
    {
      id: BASE_CHECK_IDS[0],
      state: errors === 0 ? "pass" : "fail",
      evidence: `${errors} error-severity doctor finding${errors === 1 ? "" : "s"} in scope.`,
    },
    {
      id: BASE_CHECK_IDS[1],
      state: capPasses ? "pass" : "fail",
      evidence: capPasses
        ? `work.autonomous.maxAttempts is declared as ${declaredCap}.`
        : `work.autonomous.maxAttempts is not declared as a non-negative integer (declared: ${printable(declaredCap)}; retry fallback: ${FALLBACK_MAX_ATTEMPTS}).`,
    },
    {
      id: BASE_CHECK_IDS[2],
      state: memoryPasses ? "pass" : "fail",
      evidence: `memory backend resolves to ${printable(resolvedBackend)}.`,
    },
    {
      id: BASE_CHECK_IDS[3],
      state: missing.length === 0 ? "pass" : "fail",
      evidence: `${authored.length} of ${stories.length} in-scope stories carry task payloads${missing.length > 0 ? `; missing: ${missing.join(", ")}` : ""}.`,
    },
  ];
}

function composedChecks(loops, registryFault) {
  const present = registryFault == null && loops?.present === true;
  const checks = COMPOSED_CHECK_IDS.map((id) => {
    if (registryFault != null) {
      return {
        id,
        state: "not-applicable",
        evidence: `The loop registry could not be read: ${registryFault}.`,
      };
    }
    const row = loops?.summary?.checks?.[id];
    if (!present || row?.ran !== true) {
      return {
        id,
        state: "not-applicable",
        evidence: "No loop registry is declared; this loop check did not run.",
      };
    }
    const count = row.findings;
    return {
      id,
      state: count === 0 ? "pass" : "fail",
      // Worded WITHOUT the registry command's own id on purpose: milestone 52's
      // FF-5202 bans the loop-family tokens from every `src/work-doctor*.mjs`, and a
      // human-readable evidence string tripped it just as a real import would
      // (VERIFICATION F-13). The scorer reaches the registry only through the
      // deferred command invocation its caller injects — naming the id here bought
      // nothing and broke another milestone's control.
      evidence: `The loop registry check reported ${count} finding${count === 1 ? "" : "s"}.`,
    };
  });
  return {
    registry: {
      present,
      composed: present && checks.every((row) => row.state !== "not-applicable"),
      error: present ? loops.summary.error : 0,
      warn: present ? loops.summary.warn : 0,
    },
    checks,
  };
}

function score(checks, registry) {
  const passed = checks.filter((row) => row.state === "pass").length;
  const applicable = checks.filter((row) => row.state === "pass" || row.state === "fail").length;
  const blocking = checks.filter((row) => row.state === "fail").map((row) => row.id);
  const stream = checks.find((row) => row.id === "stream-coherent");
  const clearsL3 = blocking.length === 0
    && checks.length > 0
    && checks.every((row) => row.state === "pass")
    && registry?.present === true
    && registry?.composed === true
    && registry?.error === 0;
  const clears = applicable === 0
    ? "none"
    : stream?.state === "fail"
      ? "none"
      : clearsL3
        ? "L3"
        : blocking.length === 0
          ? "L2"
          : "L1";
  return {
    score: applicable === 0 ? 0 : Math.round((100 * passed) / applicable),
    passed,
    applicable,
    clears,
    registry,
    checks,
    blocking,
  };
}

/**
 * Compute the frozen LoopReady document. Supplying `checks` exercises the total
 * arithmetic seam directly (including denominator sizes the command cannot yet
 * produce); otherwise the four base and six composed rows are built from the
 * injected doctor/registry facts.
 */
export function computeLoopReady(input) {
  if (Array.isArray(input?.checks)) {
    return score(input.checks, input.registry ?? {
      present: false,
      composed: false,
      error: 0,
      warn: 0,
    });
  }
  const composed = composedChecks(input.loops, input.registryFault ?? null);
  const checks = [
    ...baseChecks({
      findings: input.findings ?? [],
      config: input.config ?? {},
      snapshot: input.snapshot ?? { items: [] },
      scope: input.scope,
    }),
    ...composed.checks,
  ];
  return score(checks, composed.registry);
}
