# Excalidraw collaborative refinement

Status: feature-branch work in progress; CI green on PR #13. Slice 1 is the embedded editor and native-scene foundation. Slice 2 wires the human ↔ architect review loop: ask, answer, propose, preview, accept or reject. Slice 3 (below) makes diagramming its own package.

## Slice 3 — `@aof/diagrams`, diagramming as one package core can leave out

Diagramming is a project in itself and will not be wanted on every client, so its node half now lives in one workspace package, `packages/diagrams` (`@aof/diagrams`), moved out of `@aof/work` and core with `git mv` so the rename records survive for the cited-path gate:

- `./layout` — the one home of a diagram's place and spelling (was `packages/work/src/diagrams/layout.mjs`).
- `./generators` and the `diagram-design` adapter (were `packages/core/src/diagrams/`).
- `./commands/{plan,export,file,scene}` — the four `diagram:*` verbs (were `packages/work/src/commands/diagram/`).
- `./doctor-lane` — the diagrams doctor lane (was `packages/work/src/doctor/diagrams.mjs`), now returning the item listing probe beside the group. The work doctor spine takes both by injection (`diagramsGroup`, `diagramListing`, the latter defaulting to `null` for an engine built without diagramming) and names no folder; core injects node's `readdir` when it composes the lane.
- `./contribution` — `createDiagramsContribution` and `DIAGRAM_COMMAND_IDS`: the one `{ name, commands }` object core registers, in place of the verbs riding `@aof/work`'s contribution.

Dependencies run one way: the package depends on `@aof/contracts` and `@aof/work`; `@aof/work` imports nothing of it and exports no diagram module. FF-13304 (`test/arch/diagrams/acd-diagrams-package-one-way.test.mjs`) pins that, the way FF-13501 pins specification-by-example. The HTTP routes under `/api/diagram/*` stay in `@aof/server`'s board face for now (they invoke by command id and import nothing), and the bundled agent assets stay in core's bundle; both are the "routes" and "assets" slots of a wider contribution contract, the next step. The browser half is its own package too, `packages/diagrams-ui` (`@aof/diagrams-ui`): `./editor` (the `ExcalidrawEditor`, moved whole from `apps/ui/src/board`), `./editor-state` (its pure state — scene file name, fingerprint, the review invocation, proposal counts and ids, error copy, the poll rule — cut out of the board's `diagrams.mjs`, which now carries the figure only) and `./fonts` (the build-time seam that says where the SDK's fonts are, so the app's Vite config never names the SDK). `@excalidraw/excalidraw` is that package's dependency, pinned; `react`/`react-dom` are peers the app supplies. The board keeps its one dynamic `import("@aof/diagrams-ui/editor")`, so the SDK stays out of the board chunk (measured after the move: the board's chunk is unchanged, the SDK and mermaid/ELK/KaTeX chunks and 13 MB of fonts are the lazy half), the app's Tailwind build names the library's sources with `@source`, and the headless harness stubs the editor by its package export. The opt-out seam is `aof diagram capability` (`diagram:capability`, @aof/diagrams' fifth verb): it answers `{ enabled, editor, generator }` through the one reader of `work.diagrams`, so the editor follows the generator switch. The board face serves it as `GET /api/diagram/capability`, and a build WITHOUT the package — no such command in the registry — answers the same shape with `absent: true`, so the board has one code path for "off" and "not installed". The ARCHITECTURE tab asks it once per mount, through an injected asker, and shows Edit draft only when `editor` is true; the headless harness and any failure answer "not editable". The editor is now its own routed surface, `/diagram?ref=<item>&file=<ADR-NNN-slug.svg>` (`apps/ui/src/diagram/`): a fifth addressable row of the route table that the shell's nav lists under no item (the nav's own unlisted set, beside its labels, so the bar keeps its four), rendered `content:fixed` like the board. The board's Edit draft is a LINK built by the surface's one address module (`diagram-address.mjs`, on `fleet/scope.mjs`'s precedent: the path is read off the table, the query spelled with `URLSearchParams`), and the board no longer imports the editor at all. Close returns to the board with the item selected by the fragment. Ask architect binds the surface's own dock — `dock-mount.mjs`, its one posture author, a `local-pty` typed the `/aof:diagram-review` invocation, contributed to the shell's overlay slot at the board-dock host — so the architect's session sits beside the canvas rather than behind it. A `/diagram` address naming nothing renders a plain pointer back to the board.

Gates touched by the move, each with its reason recorded in the row (numbers as of the merge of main at 164–166): the CLI module ceiling 716 -> 717 (the contribution module), `packages/work/src/doctor` 13 -> 12, `packages/work/test` 58 -> 57 and `packages/core/test` 44 -> 43 (suites moved with their subjects), three new under-threshold exemptions for the node package's layers and two for the browser package's, the doctor-lane roster naming `@aof/diagrams/doctor-lane`, the installation gate's per-file ports for the node package, the board directory 27 -> 26 in both budget tables (the editor moved out), FF-5307's `ui/` digest re-pinned with the measured seven-file diff, the browser-owner set in `test/support/read-src-files.mjs` naming `@aof/diagrams-ui`, the owner census at 18, the command count 123 -> 124 and the inventory fixture regenerated for `diagram:capability`, the CLI ceiling 717 -> 718 for its module, `board-ui.mjs`'s digest re-pinned for the one GET branch, and FF-13302's handler sweep naming `capability.mjs` as the one path-less verb. Pre-existing on the Mac checkout and unrelated to the move: six `/private/var` realpath mismatches in the installation and packaging suites, the shell-out black-box case, and the two codex-ownership lane cases (Apple git 2.39 refuses the fixture's `git worktree` step); all fail identically at HEAD.

## Slice 2 — the review loop

1. In the editor, select elements (or nothing, for the whole scene), type a question or change request and choose **Ask architect**. The draft is saved first if needed, a request record is written, and the board dock starts an interactive agent session that is typed `/aof:diagram-review <ref> <ADR-NNN-slug.excalidraw> <request-id>`. The dock sits behind the fullscreen editor; close the diagram to watch or continue the conversation.
2. The architect reads `aof diagram scene … --action context` for that request. A question is answered in the session and recorded with `--action respond`. A change request becomes a proposal via `--action propose`: minimal add / update / delete element operations, with new ids prefixed `aof-` and `customData.aof` provenance.
3. The editor's **Review** panel polls `--action proposals` every 5 s while the editor is open and visible. Pending proposals offer **Preview** (selects and scrolls to touched elements), **Accept** and **Reject** (with optional reason).
4. **Accept** saves any unsaved canvas first, then merges ONLY the elements the proposal touches. It refuses `diagram-proposal-stale` if any touched element changed since the proposal was made, listing the conflicting ids, and leaves the file unchanged. Every other human edit made in the meantime is preserved. Updated/deleted elements get a bumped `version`/`versionNonce`; the UI runs the SDK's `restoreElements` (with binding repair) before rendering accepted elements.

Review records live beside the draft in `diagrams/<stem>.review/{requests,proposals}/<id>.json` (paths owned by layout.mjs). Accepting still changes only the native draft — never ARCHITECTURE.md, the SVG/PNG preview or work status. If a proposal implies an ADR amendment, the architect says so in its rationale; amending stays on the architect's existing single-writer path.

New `diagram:scene` actions: `request`, `context` (with `requestId`), `respond`, `propose`, `proposals`, `accept`, `reject`. New coded refusals: `diagram-review-unknown`, `diagram-review-id-invalid`, `diagram-proposal-invalid`, `diagram-proposal-stale`, `diagram-proposal-decided`, `diagram-review-storage-invalid`, `diagram-review-too-large`, `diagram-review-corrupt`. The bundled command ships for Claude and OpenCode, with a Codex skill variant.

Known slice-2 limits: accept writes the scene and then the proposal record — not atomic across both files (a crash between them leaves the proposal pending, and a retry is refused as stale). Agent-authored geometry/binding quality is only structurally validated; the human preview is the quality gate. Real-browser and live-agent end-to-end runs have not been performed in this sandbox.

---

# Slice 1 — embedded editor foundation

## Scope and ownership

Reuse the native Excalidraw React SDK inside the existing architecture diagram fullscreen surface. AOF owns file persistence, ADR linkage and revision checks. No draw.io intermediary and no collaboration server are introduced.

This slice adds:

- A lazy-loaded Excalidraw editor with a pinned SDK dependency (0.18.0).
- Native draft files beside an existing ADR diagram, named ADR-NNN-slug.excalidraw.
- Manual Save draft, optimistic SHA-256 revisions, atomic replacement and an exclusive writer lock.
- Read-only delivered/archived items, constrained filenames and same-origin loopback HTTP write admission.
- Selected-element or full-scene architect context, including the ADR brief, architecture document, scene revision and question.
- SDK-native scene serialization and document fingerprints: label, binding, metadata and layout edits count; camera and selection changes do not.
- Bundled SDK font assets for development and production, instead of relying on a CDN for normal font loading.

The editor does not convert arbitrary existing HTML/SVG into native objects. When no native scene exists it clearly opens an empty canvas. An engineer can import a native .excalidraw file through the SDK or create a draft manually.

A saved scene is a DRAFT. Saving does not rewrite ARCHITECTURE.md, publish an approved diagram, replace the SVG/PNG or change work status. Excalidraw's embedded browser widgets are disabled. An agent request is never executed merely because it appears in context.

## Using the first slice

1. Build the UI with node scripts/ui-build.mjs and start the usual AOF work UI.
2. Open an existing diagram in an item's ARCHITECTURE tab, then choose Edit draft.
3. Import or draw a native scene. Choose Save draft.
4. Select objects, enter a question/change request and choose Prepare architect context.
5. Copy the resulting JSON into the existing architect-agent session. The UI explicitly states that it has not dispatched the request.

The editor's Close control confirms discarding unsaved changes, and page unload is guarded. Ordinary Excalidraw Escape behavior is retained instead of making Escape dismiss the entire editor. Route changes or another shell fullscreen occupant replacing this one are not yet protected by a general navigation-blocking protocol. Export important unsaved work before navigating elsewhere.

## Command contract

All operations use the normal command registry, not filesystem logic in the HTTP face.

    aof diagram scene <ref> <ADR-NNN-slug.excalidraw> --json
    aof diagram scene <ref> <ADR-NNN-slug.excalidraw> --action save --input request.json --json
    aof diagram scene <ref> <ADR-NNN-slug.excalidraw> --action context --input request.json --json

Save input file:

    {"baseRevision":null,"scene":{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}}

Use baseRevision null only for creation. Subsequent saves must supply the revision returned by the previous read/save. The command rejects a stale revision rather than overwriting another writer. It also refuses an existing .lock file; after a crashed process, an operator must verify that no writer is active before removing a stale lock. Locks are not silently expired.

Context input file:

    {"selectedIds":[],"request":"Explain the database boundary"}

Empty selectedIds means all non-deleted elements. Context requires a saved scene and does not mutate it. The request is bounded to 10,000 characters. The architecture document is provided as data/context, not instructions with higher authority.

HTTP uses GET /api/diagram/scene for read and POST to the same endpoint for save/context. Writes require the server's matching Origin, a loopback Host and JSON content type. Query ref/file take precedence over body values. Responses are no-store. Existing transport has a 1 MB request limit; the command's native scene limit is 2 MiB with at most 5,000 elements/files. Large embedded images will hit these limits; do not assume unlimited scene uploads.

## Verification performed

- UI TypeScript check and Vite production build pass. SDK fonts are emitted under dist/excalidraw/fonts.
- All 783 UI workspace registered cases pass. Native canvas rendering is not exercised by the headless board harness: it treats the DOM/canvas-dependent editor as a leaf, as it does xterm. New fingerprint cases exercise filename, content, layout, metadata, label and binding behavior.
- 72 selected diagram/HTTP/CLI and architecture cases pass, including a real child-process scene CLI test, revision races, delivered/archive refusals and same-origin admission.
- Work workspace: 390 registered plus 113 native cases pass when run with NODE_OPTIONS=--test-reporter=tap. On Node 24 the unchanged workspace runner otherwise fails to parse the spec reporter's count even though its native cases pass.
- Immutable dependency install passes with lifecycle scripts skipped.
- Full repository suite and real-browser canvas interaction have not been verified.

### Open release gates

The supply-chain audit's name rule flagged two `bundle.js` files reached through the SDK's dependency graph (`@excalidraw/excalidraw` → `@excalidraw/mermaid-to-excalidraw` → `mermaid` → d3-shape 1.3.7 and 3.2.0). Provenance was checked rather than assumed: both are D3's `curveBundle` source, byte-identical to `src/curve/bundle.js` at github.com/d3/d3-shape tags v1.3.7 and v3.2.0 (sha256 `8ea2ba76…5e25`), and yarn.lock's checksums pin both tarballs to registry.npmjs.org. `scripts/supply-chain-audit.mjs` now admits that one collision only at `node_modules/**/d3-shape/src/curve/bundle.js` AND only with that reviewed digest; any other `bundle.js`, a look-alike package or a single changed byte still fails, and the tests assert each case. **This is a change to a security gate and needs maintainer sign-off on the PR.**

Yarn also reports transitive React/ReactDOM peer-range warnings (the SDK itself declares React 19 support, but some transitive dependencies do not). Browser validation is necessary. Large-chunk warnings remain from the SDK/diagram dependency graph. Review full third-party/font licence notices before distributing the newly bundled UI assets.

## Next slices — not implemented

0. (Done in slice 2: direct architect-session dispatch, agent proposals with element-level merge protection, preview/accept/reject.)
1. Native scene generation during refinement, rather than the existing HTML/SVG-only generator path. Resolve the synchronous generator toSvg contract explicitly; do not claim arbitrary scene JSON can be exported through the current adapter without a renderer.
2. Direct architect-session dispatch and streaming explanations from the editor using the existing runtime/session contracts.
3. Agent proposals with stable semantic identities, minimal element patches and base-revision checks, preserving human layout.
4. Human preview/accept/reject and an attributed revision log. Save draft is not an approval mechanism.
5. Explicit ADR/brief/task reconciliation through the architect's existing single-writer path and immutable delivered-ADR rules.
6. Browser end-to-end coverage, navigation-loss prevention and a full third-party/font licence review.

No full architecture intermediate representation or multi-user CRDT service is introduced in this slice. Build only the semantic identity needed for proven workflows before committing to a universal model.
