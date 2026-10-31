# Build brief

## Mechanism

This is a spelling change made at the source and re-rendered. Edit the assets under
`packages/*/assets/` and the three docs by hand, `aof work memory` → `aof memory`, reading each hit
in context: a few sit in a line that also lists verbs. Fix the README's stale `recall / brief /
…` comment while there, because `brief` was retired. Then run `aof work update` and let the
renderer rewrite the runtime folders and the lock. Never hand-edit a generated file. If the render
touches a path not in `files:`, report the contract gap rather than reverting it.

The guard (FF-17802) walks `packages/*/assets/` with a whitespace-tolerant pattern
(`aof\s+work\s+memory`). It counts the files it scanned that spell `aof memory`, so an empty walk
fails. The learning-edge control's `INVOCATION` pattern and its capture-removal helper both move to
`aof memory`. Its other assertions read the registry route `work memory`, and that route still
exists through the alias, so leave them alone.

Watch for:
- 01 must be merged first. The README control resolves `aof memory` only once it is routed.
- `refine.md` wraps a command mid-token at the end of a line. Re-read the wrapped lines after the
  edit.
- Hyperagent skills: change only the left side of each `→`. The substitution is the operator's
  ruling (STATE), not a wording slip.

## Verification

Grep the whole tree for `aof\s+work\s+memory` and account for every hit. It should be a test of
the alias, a `wiki/` record, a source comment, or the README's milestone-05 row. Run
`aof work update --dry-run` twice; the second run must be empty. Render the Cowork skill into a
temp dir under an isolated `AOF_GLOBAL_HOME` and grep it. Record FF-17802's red probe in the
milestone VERIFICATION (a planted wrapped line) and quote the message. Run the declared suites,
plus the README control and every bundle-render suite the grep names. Never run the full suite.

Hand-over names the operator's two manual steps: `aof work integrations hyperagent package` plus a
re-upload of the Hyperagent skills, and `aof planning init --runtime cowork --force` plus a
re-upload of the Cowork `.plugin`.

## Out of scope

The command itself (178/01). Source-code comments that mention the old path. Retiring the alias.
