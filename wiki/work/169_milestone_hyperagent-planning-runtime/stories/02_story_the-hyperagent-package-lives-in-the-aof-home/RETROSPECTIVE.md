---
doc: retrospective
promotionFrom: 1
---
# 169/02 · The Hyperagent package lives in the aof home — retrospective

## R1 · A delivery path built on a vendor capability nobody measured

**Kind:** mistake · **Area:** architecture · **Stage:** build (assimilate) → verify · **Owner:** architect · **Raised by:** operator (review) · **Promoted to:** none

**What happened:** The branch rendered `.hyperagent/` into every enabled project so that Hyperagent
could "Import from GitHub". 169/00 assimilated that and 169/01 rebuilt it on the integration seam,
and neither checked the import. At 169's verify the operator asked whether Hyperagent picks the folder
up. Hyperagent's docs show it does not: skills are uploaded one `SKILL.md` at a time, and an upload
belongs to the account (169 F-06).

**Why:** The setup steps came from the branch's own author, Hyperagent, and two stories took them as
measured fact. A refine names vendor behaviour as an unknown for RESEARCH, but these steps came in as
assimilated "delivered" work, so they were never treated as unknowns.

**Lesson:** Where a vendor's behaviour decides the shape of a delivery path, quote its docs (or a
measurement) in the ADR before building the path. Assimilated work carries its author's claims, and
those claims are unknowns, not facts. Once a vendor has an account-level store, use the Cowork
precedent (165/ADR-006): write the package once to the aof home and print the upload steps.

**Refs:** ../../ARCHITECTURE.md ADR-007; ../../VERIFICATION.md F-06; 165/ADR-006.

## R2 · A new class of asset file meets the membership control

**Kind:** near-miss (observation) · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer (focused run) · **Promoted to:** none

**What happened:** Once the planner files stopped being bundle members, the membership control
(every file under an asset root is declared) went red. The fix was to declare them: the fragment's
`packageFiles` lists them, the control counts that list, and the package suite pins it equal to
`PACKAGE_FILES`. Moving them out of `assets/` would have broken the packaged sidecar, which copies
`assets/` whole.

**Lesson:** An asset root's files are declared. A file a package ships for its own verbs is declared
in its fragment, not hidden from the control.

**Refs:** test/arch/bundle/acd-bundle-membership.test.mjs; packages/integration-hyperagent/assets/bundle.json.
