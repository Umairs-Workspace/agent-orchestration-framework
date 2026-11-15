// Specification by example's ONE contribution to core's bundle (192/ADR-005 §1), read by core's
// practices registry (`packages/core/src/practices.mjs`):
//
//   id       the package's name in the registry
//   assets   the package whose `assets/bundle.json` fragment core appends to its own descriptor:
//            the practice `discovery`, keyed on `work.examples.enabled`, and the fragments that
//            fill refine's and the PO, architect and QA briefs' slots (192/ADR-002, ADR-005 §2)
//
// A data leaf: it imports nothing, so a CLI path that never renders the bundle pays for this
// module and nothing behind it.
export const contribution = Object.freeze({
  id: "specification-by-example",
  name: "@aof/specification-by-example",
  assets: Object.freeze({ package: "@aof/specification-by-example" }),
});
