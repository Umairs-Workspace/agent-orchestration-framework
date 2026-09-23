import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { addProjectGlobalRef, capabilitiesPayload, loadEditableConfig, removeProjectGlobalRef, saveEditableResource, saveEditableSections } from "./config-editor.mjs";
import { supportedResourceKinds, supportedRuntimes } from "./model.mjs";
import { handleDiagramApi, handleWorkApi } from "./board-ui.mjs";
import { attachTerminalWebSocket } from "./terminal-ws.mjs";
// milestone 28 / story 00 (ADR-003): the default uiRoot routes through the ONE
// SEA-safe asset-base seam instead of joining a path off a bare import.meta.url
// — dev behaviour is byte-for-byte unchanged (an explicit options.uiRoot still
// wins, exactly as before; only the DEFAULT resolution changes carrier).
import { assetPath } from "./asset-base.mjs";
// milestone 45 / story 02 (ADR-004): the THREE static-serving rules live ONCE, in a
// pure leaf, and this server re-derives none of them. `safeStaticPath` and
// `contentType` were defined here (:262-280) and again in mesh-ui-serve.mjs — the
// guard byte-identically, the MIME table already drifted; `shouldServeAppShell` is
// the new history-fallback predicate both origins now share.
import { contentType, safeStaticPath, shouldServeAppShell } from "./static-serve.mjs";

const MAX_BODY_BYTES = 1_000_000;
const VALID_CONFIG_KINDS = new Set(supportedResourceKinds());
const VALID_RUNTIMES = new Set(supportedRuntimes());
const VALID_CATALOG_KINDS = new Set(["skill", "agent"]);

// milestone 46 / story 02 (ADR-004) — THE FLEET-ORIGIN FACT, normalised ONCE.
//
// `options.fleetOrigin` is the ONE additive option both suppliers hand down:
// `mesh-ui-serve.mjs`'s `boardUrlForWorkspace` (the launcher, which knows its own
// bound origin) and `src/commands/work-ui.mjs` (the command layer, which resolves
// the standalone default). It carries its own PROVENANCE — `{ origin, source }` —
// because the failure mode of a wrong origin is a pane that never streams and never
// says why.
//
// The THIRD value is not an oversight (PO ruling F-46.02-1, 2026-08-08). `serveBoard`
// has two production callers and at least six test suites that stand up a board with
// no fleet in sight; neither "launcher" nor "default" is honest for that board, so it
// reads `{ fleetOrigin: null, source: "none" }` — no origin was ESTABLISHED. Named,
// never smuggled into one of the other two, and never a fabricated `4181`: a reader
// that got a guessed origin would build a socket URL to a server nobody started.
//
// `null` is EXPLICIT here on purpose: `undefined` disappears from `JSON.stringify`,
// and a body missing the key is indistinguishable from an old build to a reader.
const FLEET_ORIGIN_SOURCES = Object.freeze({ LAUNCHER: "launcher", DEFAULT: "default", NONE: "none" });
const NO_FLEET_ORIGIN = Object.freeze({ fleetOrigin: null, source: FLEET_ORIGIN_SOURCES.NONE });

// THE PREDICATE IS ENFORCED AT THE SEAM, not assumed of the suppliers (QA F4). Both of
// today's callers happen to hand down a canonical origin — the fleet passes
// `new URL(...).origin`, the command layer refuses anything that is not an origin before
// it gets here — but "the value the board serves is an ORIGIN, never a bare port and
// never a URL carrying a path or a query" is the contract 46/04 READS, and a contract
// enforced only by the discipline of the current callers is enforced nowhere. A third
// supplier, or one of these two drifting, would otherwise put `4181` or
// `http://127.0.0.1:4181/fleet?x=1` in front of a URL builder that has no way to tell.
//
// So: it is an ORIGIN, or it is `null` with source "none". `parsed.origin === value` is
// the single strongest form of the test — a path, a query, a fragment, a trailing slash,
// a credential or a bare port all make those two differ — and it is the same predicate
// the task-01 shape rows assert on the wire. A refused value degrades to "no origin was
// established" rather than being served: the board cannot repair a supplier's mistake,
// and handing a reader a broken origin is strictly worse than handing it none.
function fleetOriginFactOf(supplied) {
  const raw = supplied?.origin;
  if (typeof raw !== "string" || raw.trim() === "") return NO_FLEET_ORIGIN;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return NO_FLEET_ORIGIN;
  }
  // `ws:`/`wss:` are the SOCKET schemes, derived by the URL builder from the page's own
  // scheme — never carried in this field (ADR-004).
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return NO_FLEET_ORIGIN;
  if (parsed.origin !== raw) return NO_FLEET_ORIGIN;

  // The enum stays CLOSED at this seam: only a supplier that says "launcher" gets
  // "launcher". Anything else that handed down an origin resolved it locally, which
  // is what "default" means (PO ruling F-46.02-2 — the pair answers "told, or
  // resolved", and a configured value is resolved).
  const source = supplied.source === FLEET_ORIGIN_SOURCES.LAUNCHER
    ? FLEET_ORIGIN_SOURCES.LAUNCHER
    : FLEET_ORIGIN_SOURCES.DEFAULT;
  return { fleetOrigin: raw, source };
}

export async function serveSetupUi(catalog, options = {}) {
  const port = Number.parseInt(options.port ?? "4177", 10);
  const uiRoot = options.uiRoot ? path.resolve(options.uiRoot) : assetPath("ui");
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  // Resolved once, at construction — the route serves a FACT, not a value that drifts
  // per request.
  const fleetOriginFact = fleetOriginFactOf(options.fleetOrigin);

  const server = http.createServer(async (request, response) => {
    let requestUrl;
    try {
      // A "//x" request target parses as PROTOCOL-RELATIVE ("x" becomes the host and the
      // pathname loses its first segment), so the /api/* guard below would never fire and
      // the SPA fallback would answer HTML for a stray-double-slash API URL — the masking
      // class ADR-004 (m45) exists to remove. Collapse LEADING slashes only.
      requestUrl = new URL((request.url ?? "/").replace(/^\/\/+/, "/"), "http://127.0.0.1");
    } catch {
      sendApiError(response, 400, "Invalid request URL.", "invalid-url");
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/config") {
      try {
        sendJson(response, 200, await loadEditableConfig(projectDir, editorOptions(options, "project")));
      } catch (error) {
        sendApiError(response, 400, error.message, "config-load-failed");
      }
      return;
    }

    const scopedConfigMatch = requestUrl.pathname.match(/^\/api\/config\/(project|global)$/);
    if (request.method === "GET" && scopedConfigMatch) {
      try {
        sendJson(response, 200, await loadEditableConfig(projectDir, editorOptions(options, scopedConfigMatch[1])));
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "config-load-failed");
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/capabilities") {
      sendJson(response, 200, capabilitiesPayload());
      return;
    }

    // milestone 46 / story 02 (ADR-004) — the board's FLEET-ORIGIN route: a named
    // board route BESIDE the others, on the ONE server that already carries the
    // board's HTTP API and its terminal WebSocket (m03/ADR-001).
    //
    // WHY HERE AND NOT IN `board-ui.mjs` (PO ruling F7, 2026-08-08 — the ADR names
    // `board-ui.mjs:52` and the task feature pins this route's non-GET behaviour
    // against `/api/capabilities`, which lives HERE; both homes work and the build
    // had to pick ONE): `handleWorkApi` returns false for anything outside
    // `/api/work`, so putting a non-work fact there means widening that frozen face's
    // own prefix guard — a bigger change to a surface with its own non-regression
    // suite than one additive `if` in the server that already answers `/api/config`
    // and `/api/capabilities`. And the sibling this route must never drift from is
    // two routes up: if these GET-only siblings ever answer 405 instead of falling
    // through to the `/api/` 404 below, this one moves with them because it is the
    // same shape in the same file.
    //
    // GET-only, deliberately: every other method (including HEAD) falls through to
    // the `/api/` 404 `not-found` below — the house shape for a non-GET on a GET-only
    // board route. That differs from the FLEET's `/api/mesh/board-url`, which allows
    // GET and HEAD; two servers, two house shapes, and this route follows the one it
    // lives on.
    if (request.method === "GET" && requestUrl.pathname === "/api/fleet-origin") {
      sendJson(response, 200, fleetOriginFact);
      return;
    }

    if (request.method === "PUT" && requestUrl.pathname === "/api/config/sections") {
      try {
        const sections = await readJsonBody(request);
        const result = await saveEditableSections(projectDir, sections, editorOptions(options, "project"));
        sendJson(response, result.ok ? 200 : 400, result);
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "request-failed");
      }
      return;
    }

    const resourceMatch = requestUrl.pathname.match(/^\/api\/config\/resources\/([^/]+)\/([^/]+)$/);
    if (request.method === "PUT" && resourceMatch) {
      try {
        await handleResourceSave(request, response, projectDir, options, "project", resourceMatch[1], resourceMatch[2]);
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "request-failed");
      }
      return;
    }

    const scopedResourceMatch = requestUrl.pathname.match(/^\/api\/config\/(project|global)\/resources\/([^/]+)\/([^/]+)$/);
    if (request.method === "PUT" && scopedResourceMatch) {
      try {
        await handleResourceSave(request, response, projectDir, options, scopedResourceMatch[1], scopedResourceMatch[2], scopedResourceMatch[3]);
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "request-failed");
      }
      return;
    }

    const refMatch = requestUrl.pathname.match(/^\/api\/config\/project\/global-refs\/([^/]+)\/([^/]+)$/);
    if ((request.method === "PUT" || request.method === "DELETE") && refMatch) {
      try {
        const routeKind = decodeRoutePart(refMatch[1]);
        const routeId = decodeRoutePart(refMatch[2]);
        const update = request.method === "PUT" ? addProjectGlobalRef : removeProjectGlobalRef;
        const result = await update(projectDir, { kind: routeKind, id: routeId }, editorOptions(options, "project"));
        sendJson(response, result.ok ? 200 : 400, result);
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "request-failed");
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/items" && catalog) {
      sendJson(response, 200, catalog.listItems());
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/items" && catalog) {
      try {
        const item = await readJsonBody(request);
        const diagnostics = validateCatalogItem(item);
        if (diagnostics.length > 0) {
          sendApiError(response, 400, "Catalog item is invalid.", "validation-failed", diagnostics);
          return;
        }
        catalog.upsertItem(item);
        sendJson(response, 200, { ok: true });
      } catch (error) {
        sendApiError(response, error.status ?? 400, error.message, error.code ?? "request-failed");
      }
      return;
    }

    if (await handleWorkApi(request, response, { projectDir })) return;
    // milestone 133 (F-133-02) — `/api/diagram/file`, beside the work API (see board-ui.mjs).
    if (await handleDiagramApi(request, response, { projectDir })) return;

    if (requestUrl.pathname.startsWith("/api/")) {
      sendApiError(response, 404, "API route not found.", "not-found");
      return;
    }

    // m45 / story 02 (ADR-004 [Amigos-2]) — THE ORDER IS THE DECISION, and it is
    // security-adjacent:
    //   1. /api/* answered above, unchanged;
    //   2. the traversal guard, and its `null` is TERMINAL — a refused path 404s HERE
    //      and never reaches the fallback predicate. Several traversal encodings survive
    //      URL parsing intact AND end in an extension-less segment
    //      (`/%2e%2e%2fetc%2fpasswd`, `/%2f%2fetc%2fpasswd`), so the tidy-looking
    //      `if (!filePath) -> fall back` refactor would answer 200 text/html to an
    //      attempted directory escape: it leaks no file, but it converts a refusal into
    //      a success, silently;
    //   3. only an ADMITTED path is read, and only a read that MISSES consults
    //      shouldServeAppShell.
    const filePath = safeStaticPath(uiRoot, requestUrl.pathname);
    if (!filePath) {
      send(response, 404, "text/plain", "Not found");
      return;
    }

    readFile(filePath).then((content) => {
      send(response, 200, contentType(filePath), content);
    }).catch(() => {
      // A client route that was deep-linked or refreshed renders the app shell instead
      // of 404ing (the operator-facing gap this story closes: `/board` survives a
      // reload). A request that names a FILE stays exactly as loud as it was — a
      // missing `/assets/index-abc.js` must 404, or a broken deploy arrives as
      // `Uncaught SyntaxError: Unexpected token '<'`, arbitrarily far from its cause.
      if (!shouldServeAppShell(requestUrl.pathname)) {
        send(response, 404, "text/plain", "Not found");
        return;
      }
      // A missing index.html stays the friendly 404 — ui-build-missing is LOUD, never a
      // blank 200.
      readFile(path.join(uiRoot, "index.html")).then((index) => {
        send(response, 200, "text/html", index);
      }).catch(() => {
        send(response, 404, "text/plain", "Not found");
      });
    });
  });

  // Story 02: the terminal WebSocket (/ws/terminal) on the SAME server (ADR-001).
  // `spawn`/`which` are optional injection seams for tests (no real PTY/PATH).
  // `trustCwd` — the claude folder-trust pre-write seam (default: the real writer,
  // wired inside attachTerminalWebSocket). Threaded through so the test fixture can
  // stub it; production passes nothing and gets the real one.
  // `loadWorkspace` — m46/00 (ADR-008): the same optional-injection shape, so a
  // scenario can hold the pre-session window open at the config read instead of
  // racing real file I/O. Production passes nothing and gets the real loader.
  attachTerminalWebSocket(server, { projectDir, spawn: options.spawn, which: options.which, recordSessions: options.recordSessions, trustCwd: options.trustCwd, loadWorkspace: options.loadWorkspace });

  // Reject (don't hang) when the port can't be bound — e.g. EADDRINUSE — so a
  // caller (the board launcher) can degrade honestly instead of an unhandled
  // 'error' event tearing down the process while the listen promise never settles.
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function handleResourceSave(request, response, projectDir, serverOptions, scope, kindPart, idPart) {
  const routeKind = decodeRoutePart(kindPart);
  const routeId = decodeRoutePart(idPart);
  if (!VALID_CONFIG_KINDS.has(routeKind)) {
    sendApiError(response, 400, `Unsupported resource kind "${routeKind}".`, "invalid-kind");
    return;
  }
  if (!routeId) {
    sendApiError(response, 400, "Resource id is required.", "invalid-id");
    return;
  }

  const item = await readJsonBody(request);
  if (item.kind !== undefined && item.kind !== routeKind) {
    sendApiError(response, 400, "Resource kind in payload does not match request path.", "route-payload-mismatch");
    return;
  }
  if (item.id !== undefined && item.id !== routeId) {
    sendApiError(response, 400, "Resource id in payload does not match request path.", "route-payload-mismatch");
    return;
  }
  const result = await saveEditableResource(projectDir, {
    ...item,
    kind: routeKind,
    id: routeId
  }, editorOptions(serverOptions, scope));
  sendJson(response, result.ok ? 200 : 400, result);
}

function editorOptions(serverOptions, scope) {
  return {
    scope,
    ...(serverOptions.env ? { env: serverOptions.env } : {}),
    ...(serverOptions.platform ? { platform: serverOptions.platform } : {}),
    ...(serverOptions.homedir ? { homedir: serverOptions.homedir } : {})
  };
}

function sendJson(response, status, payload) {
  send(response, status, "application/json", JSON.stringify(payload));
}

function sendApiError(response, status, message, code, diagnostics, error) {
  sendJson(response, status, {
    ok: false,
    error: message,
    code,
    ...structuredErrorDetails(error),
    ...(diagnostics ? { diagnostics } : {})
  });
}

function structuredErrorDetails(error) {
  if (!error || typeof error.toJSON !== "function") return {};
  const details = error.toJSON();
  return {
    ...(details.expected !== undefined ? { expected: details.expected } : {}),
    ...(details.actual !== undefined ? { actual: details.actual } : {}),
    ...(details.next !== undefined ? { next: details.next } : {})
  };
}

function send(response, status, contentTypeValue, body) {
  response.writeHead(status, { "content-type": contentTypeValue });
  response.end(body);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    request.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        tooLarge = true;
      }
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(httpError("Request body is too large.", "payload-too-large", 413));
        return;
      }
      if (body.trim() === "") {
        reject(httpError("Request body must be JSON.", "empty-json", 400));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(httpError(`Malformed JSON: ${error.message}`, "malformed-json", 400));
      }
    });
    request.on("error", reject);
  });
}

// m45 / story 02 (ADR-004): `contentType` and `safeStaticPath` used to be defined here.
// They now have ONE home — ./static-serve.mjs, imported at the top of this file — with
// the MIME table merged to the UNION of the two drifted copies (so this origin stops
// answering application/octet-stream for .json and .svg).

function decodeRoutePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    const error = httpError("Invalid URL encoding.", "invalid-url", 400);
    throw error;
  }
}

function validateCatalogItem(item) {
  const diagnostics = [];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return [diagnostic("item", "Catalog item must be a JSON object.")];
  }
  if (typeof item.id !== "string" || item.id.trim() === "") {
    diagnostics.push(diagnostic("id", "Catalog item id is required."));
  }
  if (!VALID_CATALOG_KINDS.has(item.kind)) {
    diagnostics.push(diagnostic("kind", "Only skills and agents are supported in setup for now."));
  }
  if (item.name !== undefined && typeof item.name !== "string") {
    diagnostics.push(diagnostic("name", "Catalog item name must be a string when provided."));
  }
  if (item.body !== undefined && typeof item.body !== "string") {
    diagnostics.push(diagnostic("body", "Catalog item body must be a string when provided."));
  }
  if (item.runtimes !== undefined) {
    if (!Array.isArray(item.runtimes) || item.runtimes.length === 0) {
      diagnostics.push(diagnostic("runtimes", "Catalog item runtimes must be a non-empty array when provided."));
    } else {
      for (const runtime of item.runtimes) {
        if (!VALID_RUNTIMES.has(runtime)) {
          diagnostics.push(diagnostic("runtimes", `Unsupported runtime "${runtime}".`));
        }
      }
    }
  }
  return diagnostics;
}

function diagnostic(pathName, message) {
  return { severity: "error", path: pathName, message, blocking: true };
}

function httpError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
