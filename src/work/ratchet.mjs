// The pure contract-integrity ratchet (57/ADR-004, FF-5705).
//
// Repository history, trees and artifact citations are observations made by the
// command boundary. This leaf receives plain strings/maps and returns plain data:
// it has no filesystem, git, process, clock or model access.
import { parseFeature } from "../feature-parse.mjs";
import { executableScenariosOf } from "./doctor-rubric.mjs";
// 66/ADR-001 section 7 — the id grammar has ONE home. This module spelled `ADR-\d+`
// three times over (with `src/commands/ratchet.mjs`) and became a second and third
// copy of it, which `66/FF-6604` reports (`F-57-M-4`). Only the ID FRAGMENT is taken
// from the leaf: the surrounding shapes below are this milestone's own citation and
// authority-heading forms, and composing them from the frozen fragment leaves their
// behaviour byte-identical while the namespace keeps one definition.
//
// ADMITTED INTO `FF-5705`'s FROZEN IMPORT SET, and the admission is narrow by
// construction: `src/declared-id.mjs` imports NOTHING and performs no I/O, so the
// engine's purity claim is unchanged. `FF-5705` asserts that of the newly admitted
// import rather than taking it on trust.
import { idForm } from "../declared-id.mjs";

// The `ADR-\d+` fragment, from the one home. Held in a constant so the three shapes
// below read as one grammar rather than three independent decisions.
const ADR_ID = idForm("ADR").id;

export const RATCHET_CODES = Object.freeze({
  BASE_UNRESOLVED: "ratchet-base-unresolved",
  CONTRACT_SHRANK: "ratchet-contract-shrank",
  CLOSED_SET_OPENED: "ratchet-closed-set-opened",
  MARKER_ADDED: "ratchet-marker-added",
  UNCLASSIFIED: "ratchet-unclassified",
});

const COMMENT_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--)/u;
const ASSERTION_WORD = /\b(?:assert(?:ion)?|expect|should|must|verify|check)\b|\bassert_\w+!\s*\(/iu;

function normalizedLines(text) {
  return String(text ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !COMMENT_LINE.test(line));
}

function multisetDifference(left, right) {
  const remaining = new Map();
  for (const line of right) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  const difference = [];
  for (const line of left) {
    const count = remaining.get(line) ?? 0;
    if (count > 0) remaining.set(line, count - 1);
    else difference.push(line);
  }
  return difference;
}

function changedLines(before, after) {
  const base = normalizedLines(before);
  const head = normalizedLines(after);
  return {
    removed: multisetDifference(base, head),
    added: multisetDifference(head, base),
  };
}

function assertionLines(lines) {
  return lines.filter((line) => ASSERTION_WORD.test(line));
}

// Frozen, deliberately conservative recognition of ADR-004 section 2's idioms.
// A form outside this vocabulary is an honest third answer, never a silent clear.
export function classifyAssertion(assertion) {
  const line = String(assertion ?? "").trim();
  if (line === "" || COMMENT_LINE.test(line) || !ASSERTION_WORD.test(line)) return "unclassified";

  const deepLiteral = /(?:deep(?:Strict)?Equal|to(?:Strict)?Equal|equal|assert_eq!)\s*\([^\n]*(?:\[[^\]]*\]|\{[^}]*\})/iu;
  const literalLength = /(?:\.\s*(?:length|size)|\b(?:len|size)\s*\()[^\n]*(?:===?|==|,|toBe|toEqual|toHaveLength)\s*\(?\s*\d+/iu;
  const setEquality = /(?:Set|FrozenSet|frozenset)\s*\([^\n]*(?:deep(?:Strict)?Equal|to(?:Strict)?Equal|===?|==|assert_eq!)/iu
    .test(line) || /(?:deep(?:Strict)?Equal|to(?:Strict)?Equal|assert_eq!)\s*\([^\n]*(?:Set|FrozenSet|frozenset)\s*\(/iu.test(line);
  const exhaustiveMembership = /(?:\[[^\]]*\]|\{[^}]*\})\s*\.\s*every\s*\([^\n]*(?:includes|contains|\bin\b)/iu
    .test(line) || /(?:every|all)\s*\([^\n]*(?:\[[^\]]*\]|\{[^}]*\})[^\n]*(?:includes|contains|\bin\b)/iu.test(line);
  if (deepLiteral.test(line) || literalLength.test(line) || setEquality || exhaustiveMembership) return "closed";

  const inequality = /(?:\.\s*(?:length|size)|\b(?:len|size)\s*\()[^\n]*(?:>=?|<=?|not\.toBe|toBeGreaterThan|toBeLessThan)/iu;
  const lengthTruthiness = /(?:assert|expect|should|must)[^\n]*(?:\.\s*(?:length|size)|\b(?:len|size)\s*\()[^\n]*(?:toBeTruthy|ok\s*\(|true\b)?/iu;
  const existential = /\.(?:some|includes|find|contains|has)\s*\(|\btoContain\s*\(|\bassert(?:In|_in)\s*\(/iu;
  if (inequality.test(line) || lengthTruthiness.test(line) || existential.test(line)) return "open";
  return "unclassified";
}

export function countExecutableContract(featureTexts = {}) {
  const scenarios = executableScenariosOf({ featureTexts }).length;
  let examplesRows = 0;
  for (const text of Object.values(featureTexts ?? {})) {
    for (const scenario of parseFeature(text).scenarios ?? []) {
      if (scenario.lane !== "executable") continue;
      for (const block of scenario.examples ?? []) examplesRows += Number(block.rows) || 0;
    }
  }
  return { scenarios, examplesRows, total: scenarios + examplesRows };
}

function contractByFile(featureTexts) {
  return Object.fromEntries(
    Object.entries(featureTexts ?? {}).map(([file, text]) => [file, countExecutableContract({ [file]: text })]),
  );
}

// ADR-004 section 5's FIRST qualifier, made load-bearing. A bare `ADR-007` is
// addressable only inside its own item's documents, and every milestone numbers
// its register from 001 — so a bare id resolves against whichever register the
// walk happens to reach, which is the unscoped read section 5 exists to refuse.
// A citation discharges only when it NAMES the owning item: `57/ADR-007`.
const CITATION = new RegExp(`^m?(?:(\\d+(?:/\\d+)?)/)?(${ADR_ID})$`, "iu");

function parseCitation(value) {
  const match = CITATION.exec(String(value ?? "").trim());
  return match == null ? null : { item: match[1] ?? null, id: match[2].toUpperCase() };
}

// The heading form is deliberately NOT `headingCaptureRe("ADR")`: this one admits an
// optional `<item>/` prefix on the heading (`## 57/ADR-007`) and carries a trailing
// `\b` the shipped ADR form does not, and the leaf's own header says in terms that
// giving the ADR form a `\b` would newly reject `## ADR-001a`. Taking the fragment and
// keeping this shape is byte-identical to what 57/03 delivered; adopting the leaf's
// whole-heading regex would have been a behaviour change wearing a tidy-up's clothes.
const AUTHORITY_HEADING = new RegExp(`^\\s*#{1,6}\\s+(?:\\d+/)?(${ADR_ID})\\b`, "iu");

function authorityIds(architectureText) {
  const ids = new Set();
  for (const line of String(architectureText ?? "").split(/\r?\n/u)) {
    const match = AUTHORITY_HEADING.exec(line);
    if (match) ids.add(match[1].toUpperCase());
  }
  return ids;
}

function citationsFor(paths, citationsByPath) {
  const cited = new Map();
  for (const file of paths) {
    for (const raw of citationsByPath?.[file] ?? []) {
      const citation = parseCitation(raw);
      if (citation) cited.set(`${citation.item ?? ""}/${citation.id}`, citation);
    }
  }
  return [...cited.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, citation]) => citation);
}

function dischargeFindings(findings, baseArchitectureText, citationsByPath, owningItemRef) {
  const authorities = authorityIds(baseArchitectureText);
  const owner = String(owningItemRef ?? "").trim();
  return findings.map((finding) => {
    if (finding.disposition !== "fired") return finding;
    const cited = citationsFor(finding.paths ?? [finding.path].filter(Boolean), citationsByPath);
    // No separate "no owning item" branch: an unresolved owner is `""`, and a parsed
    // citation's item is either null or a digit string, so the match below already
    // refuses it. A guard no probe can reach is the thing this control exists against.
    const authority = cited.find((citation) => citation.item === owner && authorities.has(citation.id)) ?? null;
    return {
      ...finding,
      citations: cited.map((citation) => (citation.item == null ? citation.id : `${citation.item}/${citation.id}`)),
      ...(authority == null ? {} : { disposition: "discharged", authority: authority.id }),
    };
  });
}

function legDisposition(findings) {
  if (findings.some((finding) => finding.disposition === "fired")) return "fired";
  if (findings.some((finding) => finding.disposition === "discharged")) return "discharged";
  if (findings.some((finding) => finding.disposition === "unclassified")) return "unclassified";
  return "clear";
}

function contractLeg(baseFeatures, headFeatures) {
  const before = countExecutableContract(baseFeatures);
  const after = countExecutableContract(headFeatures);
  if (after.total >= before.total) return { id: "contract", disposition: "clear", before, after, findings: [] };

  const baseByFile = contractByFile(baseFeatures);
  const headByFile = contractByFile(headFeatures);
  const paths = Object.keys(baseByFile).filter((file) => (headByFile[file]?.total ?? 0) < baseByFile[file].total);
  return {
    id: "contract",
    disposition: "fired",
    before,
    after,
    findings: [{ code: RATCHET_CODES.CONTRACT_SHRANK, disposition: "fired", paths }],
  };
}

function closedSetLeg(baseFiles, headFiles) {
  const findings = [];
  const compensations = [];
  for (const [file, before] of Object.entries(baseFiles ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(headFiles ?? {}, file)) continue;
    const { removed, added } = changedLines(before, headFiles[file]);
    const removedAssertions = assertionLines(removed);
    const addedAssertions = assertionLines(added);
    if (removedAssertions.length === 0 || addedAssertions.length === 0) continue;

    const removedClosed = removedAssertions.filter((line) => classifyAssertion(line) === "closed");
    const addedClosed = addedAssertions.filter((line) => classifyAssertion(line) === "closed");
    const addedOpen = addedAssertions.filter((line) => classifyAssertion(line) === "open");
    const unknownChange = removedAssertions.some((line) => classifyAssertion(line) === "unclassified")
      || addedAssertions.some((line) => classifyAssertion(line) === "unclassified");

    if (removedClosed.length > 0 && addedClosed.length > 0) {
      compensations.push({ path: file, added: addedClosed });
    } else if (removedClosed.length > 0 && addedOpen.length > 0) {
      findings.push({
        code: RATCHET_CODES.CLOSED_SET_OPENED,
        disposition: "fired",
        path: file,
        before: removedClosed,
        after: addedOpen,
      });
    } else if (unknownChange || (removedClosed.length > 0 && addedOpen.length === 0)) {
      findings.push({
        code: RATCHET_CODES.UNCLASSIFIED,
        disposition: "unclassified",
        path: file,
        before: removedAssertions,
        after: addedAssertions,
      });
    }
  }
  return {
    closed: { id: "closed-set", disposition: legDisposition(findings), findings },
    compensation: {
      id: "compensating-assertion",
      disposition: "clear",
      findings: compensations,
      applied: compensations.length > 0,
    },
  };
}

function testDeclarations(text) {
  const tests = new Map();
  const declaration = /\b(test|it)(?:\s*\.\s*(skip|only|todo))?\s*\(\s*(["'`])([^"'`]+)\3/giu;
  const withoutComments = String(text ?? "")
    .replace(/^\s*(?:\/\/|#).*$/gmu, "")
    .replace(/\/\*[\s\S]*?\*\//gu, "");
  for (const line of withoutComments.split(/\r?\n/u)) {
    if (COMMENT_LINE.test(line)) continue;
    declaration.lastIndex = 0;
    let match;
    while ((match = declaration.exec(line)) != null) {
      tests.set(`${match[1].toLowerCase()}:${match[4]}`, {
        name: match[4],
        marker: match[2]?.toLowerCase() ?? null,
      });
    }
  }
  return tests;
}

function markerLeg(baseFiles, headFiles) {
  const findings = [];
  for (const [file, before] of Object.entries(baseFiles ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(headFiles ?? {}, file)) continue;
    const baseTests = testDeclarations(before);
    const headTests = testDeclarations(headFiles[file]);
    for (const [identity, test] of baseTests) {
      const changed = headTests.get(identity);
      if (test.marker == null && changed?.marker != null) {
        findings.push({
          code: RATCHET_CODES.MARKER_ADDED,
          disposition: "fired",
          path: file,
          test: test.name,
          marker: changed.marker,
        });
      }
    }
  }
  return { id: "marker", disposition: legDisposition(findings), findings };
}

export function evaluateRatchet({
  baseCommit,
  baseSource = "resolved",
  base = {},
  head = {},
  baseArchitectureText = "",
  citationsByPath = {},
  owningItemRef = null,
} = {}) {
  if (typeof baseCommit !== "string" || baseCommit.trim() === "") {
    return { ok: false, code: RATCHET_CODES.BASE_UNRESOLVED, base: null, legs: [] };
  }

  const contract = contractLeg(base.featureTexts ?? {}, head.featureTexts ?? {});
  const { closed, compensation } = closedSetLeg(base.files ?? {}, head.files ?? {});
  const marker = markerLeg(base.files ?? {}, head.files ?? {});
  const legs = [contract, closed, marker, compensation].map((leg) => {
    const findings = dischargeFindings(leg.findings, baseArchitectureText, citationsByPath, owningItemRef);
    return { ...leg, disposition: legDisposition(findings), findings };
  });

  return {
    ok: true,
    base: { commit: baseCommit.trim(), source: baseSource === "supplied" ? "supplied" : "resolved" },
    legs,
  };
}
