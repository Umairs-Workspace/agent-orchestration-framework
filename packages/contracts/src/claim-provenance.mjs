// The one pure provenance compiler for every recorded claim (55/ADR-003).
// Facts are supplied by an impure command edge; this leaf reads no clock, filesystem,
// process state, git checkout, transcript, log, mtime, or directory listing.
export const PROVENANCE_KEYS = Object.freeze(["node", "run", "commit", "at"]);

function provenanceError(message, code, missing = []) {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  error.missing = Object.freeze([...missing]);
  return error;
}

function presentString(value) {
  return typeof value === "string" && value.length > 0;
}

function nullableString(value) {
  return value === null || presentString(value);
}

function isoInstant(value) {
  return presentString(value)
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

// Compile the frozen four-key envelope from injected facts. Extra input keys are
// intentionally ignored: a caller cannot widen the envelope by supplying a fifth.
export function compileProvenance(input = {}) {
  const candidate = input != null && typeof input === "object" && !Array.isArray(input) ? input : {};
  const missing = [];
  if (!presentString(candidate.node)) missing.push("node");
  if (!Object.prototype.hasOwnProperty.call(candidate, "run")) missing.push("run");
  if (!Object.prototype.hasOwnProperty.call(candidate, "commit")) missing.push("commit");
  if (!presentString(candidate.at)) missing.push("at");
  if (missing.length > 0) {
    throw provenanceError(
      `claim provenance is incomplete; missing ${missing.join(", ")}`,
      "claim-provenance-missing",
      missing,
    );
  }
  if (!nullableString(candidate.run)) {
    throw provenanceError("claim provenance run must be a non-empty string or null", "claim-provenance-invalid");
  }
  if (!nullableString(candidate.commit)) {
    throw provenanceError("claim provenance commit must be a non-empty string or null", "claim-provenance-invalid");
  }
  if (!isoInstant(candidate.at)) {
    throw provenanceError("claim provenance at must be an ISO-8601 instant", "claim-provenance-invalid");
  }
  return Object.freeze({
    node: candidate.node,
    run: candidate.run,
    commit: candidate.commit,
    at: candidate.at,
  });
}

// Validate an already-compiled stamp at the writer. No missing value is completed here:
// the only honest response to an incomplete claim is the coded refusal above.
export function assertStampedClaim(claim) {
  const provenance = claim?.provenance;
  if (provenance == null || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw provenanceError(
      "claim provenance is incomplete; missing provenance",
      "claim-provenance-missing",
      ["provenance"],
    );
  }
  const extra = Object.keys(provenance).filter((key) => !PROVENANCE_KEYS.includes(key));
  if (extra.length > 0) {
    throw provenanceError(
      `claim provenance carries keys outside the frozen envelope: ${extra.join(", ")}`,
      "claim-provenance-invalid",
    );
  }
  return compileProvenance(provenance);
}
