import fs from "node:fs";
import path from "node:path";
import {
  ID_FORMS,
  QUALIFIED_REF,
  declaredIdOn,
  qualifiedRefsIn,
  registerDeclarations,
} from "../declared-id.mjs";
import { ITEM_RE } from "../work.mjs";
// milestone 127 / ADR-001 §5 — a SECOND import statement from the same module, deliberately:
// `acd-proposal-provenance-resolves` pins the line above textually, and the archive root's
// name has to come from its one home too (this module spells neither root name itself).
// This resolver is SYNCHRONOUS end to end (`resolveCitationAtEmit` → `emitProposals`, consumed
// sync by `tune`), so it cannot take the async enumerator; it is a second `readdirSync` over
// the SHARED grammar — allow-listed as a keeper in FF-12701, never a second regex home.
import { ARCHIVE_ROOT } from "../work.mjs";
import { pathCitationsIn, splitPathLocator } from "../work/doctor-controls.mjs";

export const PROPOSAL_EVIDENCE_FLOOR = 2;

const toPosix = (value) => String(value).split(path.sep).join("/");
export function canonicalDocumentIdentity(value, platform = process.platform) {
  const resolved = path.resolve(value);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

function canonicalManagedEntry(parent, wanted, admittedType = null) {
  if (!fs.existsSync(parent)) return null;
  return fs.readdirSync(parent, { withFileTypes: true }).find((candidate) => {
    if (!candidate.isDirectory()) return false;
    const match = ITEM_RE.exec(candidate.name);
    return match != null
      && match[1] === String(wanted).padStart(2, "0")
      && (admittedType == null || match[2] === admittedType);
  }) ?? null;
}

function existingDirectoryForItem(workDir, itemRef) {
  const segments = String(itemRef).split("/");
  const wanted = segments.map((segment) => Number.parseInt(segment, 10));
  if (
    segments.length < 1
    || segments.length > 2
    || segments.some((segment) => segment === "" || ![...segment].every((char) => char >= "0" && char <= "9"))
    || wanted.some((part) => !Number.isFinite(part))
  ) return null;

  // A numbered item lives under the root or (127/ADR-001 §4) under the archive, name
  // verbatim — so an archived milestone's declarations still resolve for a citation that
  // names it by number. The root is asked first; a number found there is the answer.
  for (const root of [workDir, path.join(workDir, ARCHIVE_ROOT)]) {
    const top = canonicalManagedEntry(root, wanted[0]);
    if (top == null) continue;
    const topDir = path.join(root, top.name);
    if (segments.length === 1) return topDir;
    if (top.name.split("_")[1] !== "milestone") return null;
    const story = canonicalManagedEntry(path.join(topDir, "stories"), wanted[1], "story");
    return story == null ? null : path.join(topDir, "stories", story.name);
  }
  return null;
}

function documentDeclarations(text, file) {
  const declared = new Set(registerDeclarations(text, file).map((entry) => entry.id));
  for (const line of String(text).split(/\r?\n/)) {
    const id = declaredIdOn(line);
    if (id == null) continue;
    const form = ID_FORMS.find((candidate) => id.startsWith(`${candidate.name}-`));
    if (form?.scope === "document") declared.add(id);
  }
  return declared;
}

function declarationDocument(workDir, itemRef, id) {
  const itemDir = existingDirectoryForItem(workDir, itemRef);
  if (itemDir == null) return { itemDir: null, document: null };
  const documents = fs
    .readdirSync(itemDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  for (const name of documents) {
    const absolute = path.join(itemDir, name);
    if (documentDeclarations(fs.readFileSync(absolute, "utf8"), name).has(id)) {
      return { itemDir, document: absolute };
    }
  }
  return { itemDir, document: null };
}

function lineCountOnDisk(file) {
  const text = fs.readFileSync(file, "utf8");
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.length;
}

export function pathIsWithinRoot(rootDir, candidate, platform = process.platform) {
  const comparable = (value) => {
    const resolved = path.resolve(value);
    return platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  const root = comparable(rootDir);
  const target = comparable(candidate);
  return target === root || target.startsWith(`${root}${path.sep}`);
}

function documentPathCandidates(citation, rootDir, sourceDocument, platform) {
  const split = splitPathLocator(citation);
  const normalized = split.path.split("/").join(path.sep);
  const candidates = [path.resolve(rootDir, normalized)];
  if (sourceDocument != null) {
    const source = path.isAbsolute(sourceDocument) ? sourceDocument : path.resolve(rootDir, sourceDocument);
    const normalizedAt = String(citation).indexOf(split.path);
    const asWritten = normalizedAt < 0 ? normalized : String(citation).slice(0, normalizedAt + split.path.length);
    const relativeToSource = path.resolve(path.dirname(source), asWritten.split("/").join(path.sep));
    if (asWritten.startsWith(".")) candidates.unshift(relativeToSource);
    else candidates.push(relativeToSource);
  }
  return {
    split,
    candidates: [...new Set(candidates)].filter((candidate) => pathIsWithinRoot(rootDir, candidate, platform)),
  };
}

function failure(citation, code, question, message) {
  return { citation, code, question, message };
}

export function extractProvenanceCitations(provenance) {
  const entries = Array.isArray(provenance) ? provenance : provenance == null || provenance === "" ? [] : [provenance];
  const citations = [];
  const unreadable = [];

  for (const entry of entries) {
    const text = String(entry?.citation ?? entry?.ref ?? entry?.text ?? entry ?? "");
    const paths = pathCitationsIn(text);
    const refs = qualifiedRefsIn(text);
    const pathSpans = [];
    let pathCursor = 0;
    while (pathCursor < text.length) {
      const citation = paths
        .filter((candidate) => text.startsWith(candidate, pathCursor))
        .sort((left, right) => right.length - left.length)[0] ?? null;
      if (citation == null) {
        pathCursor += 1;
        continue;
      }
      const end = pathCursor + citation.length;
      pathSpans.push({ start: pathCursor, end, value: { kind: "document", citation } });
      pathCursor = end;
    }
    const refSpans = [];
    let refCursor = 0;
    for (const ref of refs) {
      const at = text.indexOf(ref.ref, refCursor);
      if (at < 0) continue;
      const end = at + ref.ref.length;
      refCursor = end;
      if (!pathSpans.some((span) => at >= span.start && end <= span.end)) {
        refSpans.push({ start: at, end, value: { kind: "id", citation: ref.ref, item: ref.item, id: ref.id } });
      }
    }
    const seen = new Set();
    for (const span of [...pathSpans, ...refSpans].sort((left, right) => left.start - right.start || right.end - left.end)) {
      const key = `${span.start}:${span.end}:${span.value.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push(span.value);
    }
    if (paths.length === 0 && refs.length === 0 && text.trim() !== "") {
      unreadable.push(
        failure(text, "citation-unreadable", "citation", `No owning citation grammar could read ${JSON.stringify(text)}`),
      );
    }
  }
  return { citations, unreadable };
}

export function resolveCitationAtEmit(citation, options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const workDir = path.resolve(rootDir, options.workDir ?? path.join("wiki", "work"));
  const entry = typeof citation === "string" ? extractProvenanceCitations([citation]) : { citations: [citation], unreadable: [] };
  if (entry.unreadable.length > 0 || entry.citations.length !== 1) {
    return { ok: false, failure: entry.unreadable[0] ?? failure(String(citation), "citation-unreadable", "citation", "Citation is ambiguous or unreadable") };
  }

  const parsed = entry.citations[0];
  if (parsed.kind === "document") {
    const { split, candidates } = documentPathCandidates(parsed.citation, rootDir, options.sourceDocument, options.platform);
    const absolute = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (absolute == null) {
      return {
        ok: false,
        failure: failure(parsed.citation, "file-absent", "file", `${parsed.citation}: there is no such file on disk`),
      };
    }
    if (split.line != null) {
      const count = lineCountOnDisk(absolute);
      if (split.line < 1 || split.line > count) {
        return {
          ok: false,
          failure: failure(
            parsed.citation,
            "line-absent",
            "line",
            `${parsed.citation}: the file has ${count} line${count === 1 ? "" : "s"}, so line ${split.line} does not exist`,
          ),
        };
      }
    }
    return {
      ok: true,
      resolved: {
        kind: "document",
        citation: parsed.citation,
        document: toPosix(path.relative(rootDir, absolute)),
        absoluteDocument: absolute,
        line: split.line,
      },
    };
  }

  const declaration = declarationDocument(workDir, parsed.item, parsed.id);
  if (declaration.itemDir == null) {
    return {
      ok: false,
      failure: failure(parsed.citation, "item-absent", "item", `${parsed.citation}: item ${parsed.item} is not on disk`),
    };
  }
  if (declaration.document == null) {
    return {
      ok: false,
      failure: failure(
        parsed.citation,
        "declaration-absent",
        "declaration",
        `${parsed.citation}: ${parsed.id} is declared nowhere in item ${parsed.item}'s documents`,
      ),
    };
  }
  return {
    ok: true,
    resolved: {
      kind: "id",
      citation: parsed.citation,
      item: parsed.item,
      id: parsed.id,
      document: toPosix(path.relative(rootDir, declaration.document)),
      absoluteDocument: declaration.document,
      line: null,
    },
  };
}

export function resolveProvenanceAtEmit(provenance, options = {}) {
  const extracted = extractProvenanceCitations(provenance);
  const resolved = [];
  const failures = [...extracted.unreadable];
  for (const citation of extracted.citations) {
    const answer = resolveCitationAtEmit(citation, options);
    if (answer.ok) resolved.push(answer.resolved);
    else failures.push(answer.failure);
  }
  const documents = new Map();
  for (const citation of resolved) {
    documents.set(canonicalDocumentIdentity(citation.absoluteDocument, options.platform), citation.document);
  }
  return {
    citationCount: extracted.citations.length,
    resolved,
    failures,
    sourceDocuments: [...documents.values()],
    distinctSourceDocumentCount: documents.size,
  };
}

const candidateName = (candidate, index) => String(candidate?.id ?? candidate?.name ?? candidate?.title ?? `candidate-${index + 1}`);

export function emitProposals(candidates, options = {}) {
  const proposalEvidenceFloor = PROPOSAL_EVIDENCE_FLOOR;
  const acceptanceEvidenceToCommit = options.acceptanceEvidenceToCommit ?? null;
  const proposals = [];
  const findings = [];
  let declinedBelowEvidenceFloor = 0;

  for (const [index, candidate] of [...(candidates ?? [])].entries()) {
    const name = candidateName(candidate, index);
    const resolution = resolveProvenanceAtEmit(candidate?.provenance ?? [], {
      rootDir: options.rootDir,
      workDir: options.workDir,
      platform: options.platform,
      sourceDocument: candidate?.sourceDocument ?? options.sourceDocument,
    });
    const record = { ...candidate, candidate: name, provenanceResolution: resolution };

    if (resolution.failures.length > 0) {
      findings.push({
        ...record,
        code: "unresolvable-provenance",
        kind: "unresolvable-provenance",
        message: `${name} was demoted because ${resolution.failures.map((item) => item.message).join("; ")}`,
        failures: resolution.failures,
        resolvedCitations: resolution.resolved,
      });
      continue;
    }
    if (resolution.distinctSourceDocumentCount < proposalEvidenceFloor) {
      declinedBelowEvidenceFloor += 1;
      findings.push({
        ...record,
        code: "below-evidence-floor",
        kind: "below-evidence-floor",
        message: `${name} cites ${resolution.distinctSourceDocumentCount} distinct source document(s); ${proposalEvidenceFloor} are required to emit a proposal`,
        distinctSourceDocumentCount: resolution.distinctSourceDocumentCount,
        sourceDocuments: resolution.sourceDocuments,
      });
      continue;
    }
    proposals.push(record);
  }

  return {
    considered: [...(candidates ?? [])].length,
    proposalEvidenceFloor,
    acceptanceEvidenceToCommit,
    declinedBelowEvidenceFloor,
    proposals,
    findings,
  };
}

// Candidate formation already knows the item a record came from. It can therefore
// emit the addressable qualified form without scraping a bare id from prose.
export function citationForRecord(record, { prefix = true } = {}) {
  if (record?.itemRef == null || record?.id == null) return null;
  const ref = `${prefix ? "m" : ""}${record.itemRef}/${record.id}`;
  const grammar = new RegExp(QUALIFIED_REF.source, QUALIFIED_REF.flags);
  return grammar.test(ref) ? ref : null;
}
