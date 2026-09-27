@executable @cli @assets @distribution
Feature: The nine records ship as bundle ASSET members — verbatim, unstamped, and to both runtimes

  The STORY cites `.aof/templates/` as the precedent, and as a PIPELINE it is the right one: aof's own
  content, hash-stamped in `src/bundle/manifest.json`, installed into `.aof/`, refreshed by
  `work update`, git-tracked. As a MECHANISM it is measured to be impossible, twice over, and this
  task exists because getting it wrong installs nine files that all fail to load:

  1. `templateOutputPath` (`src/work-bundle.mjs:194-196`) hard-codes
     `.aof/templates/work/<member-id>/<file>`. It cannot address `.aof/loops/` at all.
  2. `renderBundleTemplateOutputs` prepends `TEMPLATE_STAMP` — `<!-- aof-generated: bundle -->` plus a
     blank line — at `:207` (constant at `:28`). `loadLoops`'s `rawFrontmatter` anchors at the FIRST
     line (`src/work-loops.mjs:154-157`, `^`-anchored, no `m` flag), so a stamped record parses to
     `null` and emits `loop-record-unparseable` at `severity: "error"`. **All nine would install and
     all nine would fail to load** — a silent-green delivery: `work update` reports nine files
     written, `work loops show` reports an empty registry. This is the same failure the fixture
     builder already mechanises as its `leadingBlank` case (`test/support/loop-registry-fixture.mjs:90-92`),
     which is why it is cheap to assert and expensive to discover.

  The `asset` kind is what the story wants, and its own source comment says so:
  `renderBundleAssetOutputs` (`src/work-bundle.mjs:167-183`) emits "one output per asset member whose
  declared runtimes intersect the selected ones, **at its declared target path, with its bytes
  UNCHANGED (a script is not a rendered document — a stamp would break it)**". A loop record is not a
  rendered document either. The one existing asset member (`artifact-sync-enqueue`,
  `src/bundle/bundle.json`) proves the shape: `{id, kind: "asset", file, target, runtimes}`. Note
  what is NOT authored — `body` is READ from `file` by `loadBundle` (`src/work-bundle.mjs:154`), so a
  descriptor that authored it would carry dead data that could silently disagree with the file.

  One hazard the asset renderer carries and this task closes: `runtimes` defaults to `["claude"]`
  (`:172`) and the loop `continue`s when the selected runtimes do not intersect (`:174`). The lone
  existing asset declares `["claude"]` only. Nine records declaring `["claude"]` would leave a
  `--runtime codex` install with **no registry at all** — `present: false`, an empty
  `work loops show` — which is precisely the defect this story exists to remove, reintroduced on the
  other runtime. The records declare **both**, because a loop record describes aof, and aof's loops
  run whichever runtime the consumer chose.

  `bundle.json` goes 50 → 59 members and `manifest.json` 87 → 96 entries **by regeneration**
  (`scripts/generate-bundle-manifest.mjs` → `generateBundleManifest`/`serializeBundleManifest`,
  `src/work-bundle-manifest.mjs:44-63`), never by hand-authoring: the manifest is a content address of
  the render, sorted by `(path, runtime)`, with no timestamps (`:9-10, :38-41`). `src/work-bundle.mjs`,
  `src/work-bundle-manifest.mjs` and `src/render-plan.mjs` are NOT edited — the nine members are data,
  and the pipeline already carries their kind. ADR-012 §4–§5.

  Scenario: each record is declared as an asset member with an explicit target under `.aof/loops/`
    Given the nine loop records at `src/bundle/loops/<slug>.md`
    When the bundle descriptor is read
    Then each is a member with `kind: "asset"`
    And each declares `file: "loops/<slug>.md"`
    And each declares `target: ".aof/loops/<slug>.md"`
    And each declares `runtimes: ["claude", "codex"]`
    And none authors a `body` — the body is read from `file` at load time, so authoring it would be dead data that can disagree with the file
    And no record is declared with `kind: "template"`

  Scenario: the installed record is byte-identical to the shipped record — no stamp, nothing prepended
    Given the bundle is rendered
    When the output for each loop record is read
    Then its content is byte-identical to the file at `src/bundle/loops/<slug>.md`
    And it does not begin with `<!-- aof-generated: bundle -->`
    And its first line is `---`
    And `rawFrontmatter` returns a block rather than `null` for every one of the nine

  Scenario: the counter-case is asserted, because it is the failure that would ship silently
    Given a loop record rendered through the TEMPLATE path with `TEMPLATE_STAMP` prepended
    When it is loaded
    Then it emits `loop-record-unparseable` at `severity: "error"`
    And the registry reports zero nodes for it
    And this is asserted as a NEGATIVE control so the asset path cannot regress into the template path unnoticed

  Scenario: a codex-only install gets the registry
    Given `runtimes` is selected as `["codex"]`
    When the bundle is rendered
    Then nine loop-record outputs are emitted
    And each is byte-identical to its claude-runtime render
    And the registry is not empty on codex — the defect this story removes is removed on both runtimes

  Scenario: a claude-only install gets the registry
    Given `runtimes` is selected as `["claude"]`
    When the bundle is rendered
    Then nine loop-record outputs are emitted

  Scenario: exactly one output per record, so no two members contend for one path
    Given the full render across both runtimes
    When the outputs are grouped by path
    Then each of the nine `.aof/loops/<slug>.md` paths carries exactly one output
    And no loop record's target collides with any template, hook, skill, command or agent target
    And no loop record's target lands under `.aof/templates/`

  Scenario: the manifest is regenerated, not authored
    Given `src/bundle/manifest.json` after the nine members are added
    When a fresh render is hashed
    Then every shipped entry's `hash` equals `hashContent` of the re-rendered content
    And the manifest's path set deep-equals the rendered path set
    And the manifest embeds no timestamp
    And regenerating it twice produces byte-identical files

  Scenario: the pipeline modules are not edited
    Given the diff for this story
    Then `src/work-bundle.mjs` does not appear in it
    And `src/work-bundle-manifest.mjs` does not appear in it
    And `src/render-plan.mjs` does not appear in it
    And `src/work-bundle-synthesis.mjs` does not appear in it — it is the module that maps an asset output to its install path, so a pin that omits it under-specifies the claim
    And the nine records reach the consumer as DATA through a pipeline that already exists

  Examples:
    | record file                              | member id                     | target                                      |
    | `loops/autonomous-cascade.md`            | `loop-autonomous-cascade`     | `.aof/loops/autonomous-cascade.md`          |
    | `loops/build-to-green.md`                | `loop-build-to-green`         | `.aof/loops/build-to-green.md`              |
    | `loops/mesh-assignment-reclaim.md`       | `loop-mesh-assignment-reclaim`| `.aof/loops/mesh-assignment-reclaim.md`     |
    | `loops/retrospective-memory-ingest.md`   | `loop-retrospective-memory-ingest` | `.aof/loops/retrospective-memory-ingest.md` |
    | `loops/review-fix-rereview.md`           | `loop-review-fix-rereview`    | `.aof/loops/review-fix-rereview.md`         |
    | `loops/run-resilience.md`                | `loop-run-resilience`         | `.aof/loops/run-resilience.md`              |
    | `loops/verify-triage-accept.md`          | `loop-verify-triage-accept`   | `.aof/loops/verify-triage-accept.md`        |
    | `loops/operator.md`                      | `actor-operator`              | `.aof/loops/operator.md`                    |
    | `loops/product-owner.md`                 | `actor-product-owner`         | `.aof/loops/product-owner.md`               |

  Examples:
    | mechanism         | target addressable? | bytes preserved? | verdict                                        |
    | `kind: "asset"`   | yes — declared `target` | yes (`:167-183`) | the mechanism                              |
    | `kind: "template"`| no — `templateOutputPath` hard-codes `.aof/templates/work/<id>/` | no — `TEMPLATE_STAMP` at `:207` | refused; all nine become `loop-record-unparseable` |
    | `kind: "hook"`    | no — hook targets are runtime hook dirs | n/a         | refused, wrong concept                         |
    | a new kind        | would need `src/work-bundle.mjs:158`'s allow-list widened | n/a | refused — a kind that already fits is not a reason for a new one |

  Examples:
    | declared `runtimes` | `--runtime claude` install | `--runtime codex` install |
    | `["claude","codex"]`| nine records               | nine records              |
    | `["claude"]`        | nine records               | **zero** — the defect, reintroduced |
    | `["codex"]`         | **zero**                   | nine records              |
    | absent              | nine (defaults `["claude"]`) | **zero**                |
