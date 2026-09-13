# 121 · The Import Specifier Extractor Has Twenty Homes And 119 00 Added The Twentieth — Outcome

## Delivered

### One import-specifier extractor under `test/`
`test/support/module-family.mjs`'s `importSpecifiers` is the only extractor a suite under `test/arch/**`
reads: 41 files consume it, the DoD's own grep (`function (directImports|staticImports|importSpecifiers|imports)\(`)
finds the home, two one-line `!entry.dynamic` delegates (`acd-controls-never-execute`,
`acd-command-layer-imports-downward`), and the two declarers left outside `test/arch/**` by recorded
decision — down from twenty.

### FF-11901 leg 5 is a class over `test/arch/**`
`acd-purity-is-external.test.mjs` reads every suite under `test/arch/**` through a shape detector (a
quoted-specifier capture after `from`/`import`/`require`, over `blankStringLiterals`), so a new own
extractor — under any name, or inline at the call site — fails CI; the five remainders sit in a
shrink-only `EXTRACTOR_BASELINE`, each entry carrying its file and its reason.

### The home reads a backtick-quoted call specifier
A template literal with no `${…}` is a literal in both call forms (`importSpecifiers` reports
`` import(`./x.mjs`) `` and `` require(`./x.mjs`) ``); one with a substitution stays computed
(`computedDynamicImports`), and the two partition the call.

### Static-closure walkers keep a static contract
`acd-trigger-holds-no-clock` and `acd-session-driver-mesh-blind` read the home through
`.filter((entry) => !entry.dynamic)`, so FF-6301, FF-6303 ("one `setTimeout`, in `src/fs.mjs`") and
FF-5301 ("reach is exactly 71") hold the ceilings they held before the conversion.

## Gaps

### The home carries no import clause and is not string-literal-aware
- **Status:** open
- **Discharge condition:** `importSpecifiers` returns `clause` for the static form and extracts over
  `blankStringLiterals` (recovering the specifier at the stripped source's offsets), so a plant inside
  a template literal is not an import — the story shape 121's review hands back.

Three baseline entries (`acd-loop-document-current`, `acd-loop-suite-registration`,
`acd-feature-parser-single-home`) need the clause/bindings, and `test/session/agent-session-driver-door.test.mjs`
asserts a plant inside a template literal is NOT an import; none can read the home as it stands, so the
ratchet holds at five rather than two.

### `computedDynamicImports` names `import(` alone
- **Status:** open
- **Discharge condition:** a computed `` require(`./${x}.mjs`) `` is reported by `computedDynamicImports`.

`importSpecifiers` drops a `require(` whose template literal carries a substitution, and
`computedDynamicImports` does not name it either, so a computed `require` is invisible to every
closure control that reads the home.
