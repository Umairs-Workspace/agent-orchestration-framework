# 00 · A prototype is a work item — Outcome

## Delivered

### A prototype resolves like any work item
A `NN_prototype_<slug>` folder in `wiki/work` (or the backlog) is a top-level work item that `aof work find`, `status`, `list` and `doctor` resolve. It is neither a driver nor a depend target, so `aof work next` never offers one and no `depends:` may name one (FF-16802).

### A prototype has its own four status words
A prototype's status is `active`, `paused`, `done` or `abandoned`. Its edges are `active ⇄ paused`, either one `→ done | abandoned`, and `done` and `abandoned` reopen to `active`. The governed five words and their order are unchanged, and `aof work status` refuses a governed word on a prototype as `status-edge-not-applicable`, naming the legal moves, and refuses a prototype word on a governed item.

### Validate holds a prototype to its two files
`aof work validate` checks a prototype's frontmatter, the `## Intent`, `## Wants` and `## Shortcuts` sections of `PROTOTYPE.md` (Intent and Wants filled past the template), the `## Hand-off` and `## Log` sections of `STATE.md`, and that it carries no `depends:` or `parent:`. The doctor's lifecycle lanes skip it, so a well-formed prototype is clean at every status word (FF-16803).

### One type-to-record-doc map
`RECORD_DOC_BY_TYPE` in `packages/work/src/identity.mjs` is the only map from an item type to its record doc (`prototype → PROTOTYPE.md` among them), and records, doctor coherence, the doctor snapshot and the ratchet all read it (FF-16801).

### The prototype templates ship in the bundle
`.aof/templates/work/prototype/` holds `PROTOTYPE.md` and `STATE.md`, declared in `bundle.json` as template `prototype` and rendered by `aof work update`.
