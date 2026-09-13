// The ONE terminal control's SOCKET URL BUILDER (milestone 46 / story 03 / task 03 —
// ADR-004). A framework-free ESM module — no React, no DOM, no socket — and, the point of
// the whole design, it READS NO GLOBAL. It takes the origins as an ARGUMENT.
//
// Three builders collapse into this one: the board's `terminalWsUrl`, the board's
// `mirrorWsUrl` and the fleet's `terminalViewSocketUrl`. Between them they held one port
// literal (`FLEET_PORT = 4181`), one page-origin-versus-dialled-origin bug, and three
// different opinions about what a missing half-tuple means.
//
// THE INVARIANT THIS SERVES: no terminal surface holds a port literal. Not a constant, not a
// template, not a default argument. The port is retired, not relocated — an origin is a
// SCHEME, a HOST and an OPTIONAL PORT handed in WHOLE, never a hostname this builder
// decorates. An origin with no port produces a URL with no port.
//
// WHY AN ARGUMENT AND NOT A GLOBAL. The same `ui/dist` bundle is served from three origins,
// and a builder that read a global would pass every headless test and fail only in a browser
// — the exact class of defect this repo has no harness to catch. Resolvability is an INPUT
// so the whole task stays headless; that is the shape the shell's nav model established and
// m45's route module kept.
//
// THE SCHEME KEYS OFF THE DIALLED ORIGIN, NOT OFF THE PAGE. For a `local-pty` those are the
// same thing. For a cross-origin `mirror` they are not, and today's code has it wrong: it
// takes the PAGE's protocol with the FLEET's hostname, which is how an `http` fleet gets
// dialled at `wss://` and fails with nothing but a closed socket to show for it. A plain
// fleet dialled from a TLS board is a genuine mixed-content refusal at the browser, and this
// builder must not hide it behind a scheme it invented. (PO ruling, 2026-08-08: treat the
// corrected rows as a `@bug` fix, not a new behaviour.)
//
// EVERY DECLARED PARAM IS REQUIRED, AND A HALF-TUPLE YIELDS NO URL AT ALL — never a guessed,
// defaulted or sibling session, and never a node-only subscription that would bleed another
// session's bytes into this pane. "No URL" is the structural half of "no socket is opened",
// and the refusal names WHICH half was missing without naming any value it did not have.

export const REFUSAL_MISSING_PARAM = "missing-param";
export const REFUSAL_MISSING_ORIGIN = "missing-origin";
export const REFUSAL_UNRESOLVABLE_ORIGIN = "unresolvable-origin";
export const REFUSAL_UNSUPPORTED_SCHEME = "unsupported-scheme";
export const REFUSAL_NO_SOURCE = "no-source";

// THE SCHEME IS MAPPED, NEVER DEFAULTED — and this table is why.
//
// The obvious spelling, `protocol === "https:" ? "wss" : "ws"`, has a silent and dangerous
// cell: an origin handed in as `wss://fleet.example` falls through the ternary and is DIALLED
// AT `ws://`. A security level the caller explicitly named would be downgraded to plaintext
// with nothing to show for it — no refusal, no warning, just a URL that looks right. The same
// fall-through quietly coerces a nonsense origin (`ftp://…`) into a plausible-looking `ws://`
// URL rather than saying it cannot dial it.
//
// So: the two secure schemes map to `wss`, the two plaintext schemes map to `ws`, and
// ANYTHING ELSE IS REFUSED BY NAME. There is no default cell.
const SCHEME_FOR_ORIGIN = Object.freeze({
  "https:": "wss",
  "wss:": "wss",
  "http:": "ws",
  "ws:": "ws",
});

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function refuse(reason, missing, message) {
  return Object.freeze({
    url: null,
    scheme: null,
    authority: null,
    path: null,
    originRole: null,
    params: null,
    reason,
    missing: Object.freeze(missing),
    message,
  });
}

// terminalSocketUrl(source, params, { origins }) — the one builder.
//
// `source` is a descriptor off the frozen table (or any descriptor of that SHAPE — the
// builder keys on the descriptor's FIELDS, never on its kind, so a future source is a table
// row and nothing here learns a new word). `params` is a plain object of the values that
// address it. `origins` maps an origin ROLE (`self`, `fleet`) to a whole origin string.
//
// Returns a frozen result: `{ url, scheme, authority, path, originRole, params }` on success,
// or `{ url: null, reason, missing, message }` on a refusal.
export function terminalSocketUrl(source, params = {}, { origins } = {}) {
  if (source == null || typeof source !== "object") {
    return refuse(REFUSAL_NO_SOURCE, [], "no session source was supplied, so no route is known");
  }
  const declared = Array.isArray(source.params) ? source.params : [];
  const path = nonEmptyString(source.path);
  const originRole = nonEmptyString(source.originRole);
  if (path == null || originRole == null) {
    return refuse(REFUSAL_NO_SOURCE, [], "the session source declares no route or no origin role");
  }

  // Every declared param, in the order the source declares it. A missing one is named; its
  // VALUE is never invented and no sibling's value is ever borrowed to complete a tuple.
  //
  // MISSING AND MALFORMED ARE DIFFERENT CAUSES, and this refusal names the true one. A param
  // that is PRESENT but is not a string (`{ sessionId: 42 }`) is not missing, and reporting it
  // as missing sends the caller looking for a value that is sitting right there. "A refusal
  // must name its own cause" is this codebase's rule, and a refusal naming the wrong cause is
  // worse than a vague one.
  const missingParams = [];
  const malformedParams = [];
  const query = new URLSearchParams();
  for (const name of declared) {
    const raw = params?.[name];
    const value = nonEmptyString(raw);
    if (value == null) {
      if (raw === undefined || raw === null || raw === "") missingParams.push(name);
      else malformedParams.push(name);
      continue;
    }
    query.append(name, value);
  }
  if (missingParams.length > 0 || malformedParams.length > 0) {
    const causes = [];
    if (missingParams.length > 0) {
      causes.push(`${missingParams.join(" and ")} ${missingParams.length === 1 ? "is" : "are"} missing`);
    }
    if (malformedParams.length > 0) {
      causes.push(`${malformedParams.join(" and ")} ${malformedParams.length === 1 ? "is" : "are"} not a string`);
    }
    return refuse(
      REFUSAL_MISSING_PARAM,
      [...missingParams, ...malformedParams],
      `no socket URL: ${causes.join("; ")}`,
    );
  }

  const origin = nonEmptyString(origins?.[originRole]);
  if (origin == null) {
    // Nothing is guessed: no `localhost`, no page origin substituted for a missing fleet
    // origin, no default port. A pane that cannot resolve its origin opens no socket and
    // says why.
    return refuse(
      REFUSAL_MISSING_ORIGIN,
      [originRole],
      `no socket URL: the ${originRole} origin was not supplied`,
    );
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return refuse(
      REFUSAL_UNRESOLVABLE_ORIGIN,
      [originRole],
      `no socket URL: the ${originRole} origin is not a URL`,
    );
  }

  // `host` is authority-with-port-if-there-is-one, straight off the origin that was handed
  // in. Nothing is appended and nothing is stripped.
  const authority = parsed.host;
  if (authority.length === 0) {
    return refuse(
      REFUSAL_UNRESOLVABLE_ORIGIN,
      [originRole],
      `no socket URL: the ${originRole} origin names no host`,
    );
  }
  const scheme = SCHEME_FOR_ORIGIN[parsed.protocol];
  if (scheme === undefined) {
    return refuse(
      REFUSAL_UNSUPPORTED_SCHEME,
      [originRole],
      `no socket URL: the ${originRole} origin's scheme ${parsed.protocol} is not one this control can dial`,
    );
  }

  return Object.freeze({
    url: `${scheme}://${authority}${path}?${query.toString()}`,
    scheme,
    authority,
    path,
    originRole,
    params: Object.freeze([...query.entries()].map(([key, value]) => Object.freeze([key, value]))),
    reason: null,
    missing: Object.freeze([]),
    message: null,
  });
}
