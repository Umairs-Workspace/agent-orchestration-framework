// Teaching's pedagogy, named once (179/ADR-006 §1). `teach.md` is hand-written prose that uses each
// entry's exact words, and FF-17903 (`test/arch/command/acd-teach-vocabulary-one-home.test.mjs`)
// pins the prompt to these lists, so milestone 180's checks read the same words rather than spelling
// them again.
//
//   STAGES       the six problem-solving stages (Loksa et al.) — a map the human navigates, never a
//                sequence of approvals
//   HELP_LADDER  the five rungs of pull-based help, weakest first; each task starts at the first
//                (ADR-006 §3)
//   TRAPS        the eight traps, each paired with the control the SPEC gives it — taught through
//                the current problem, never as a label on the human
//
// A data leaf: it imports nothing and writes nothing (ADR-006 §5).
export const STAGES = Object.freeze([
  "reinterpret",
  "find analogies",
  "consider solutions",
  "evaluate a candidate",
  "implement",
  "evaluate the implementation",
]);

export const HELP_LADDER = Object.freeze([
  "diagnostic question",
  "conceptual hint",
  "analogous example",
  "partial scaffold",
  "worked explanation",
]);

export const TRAPS = Object.freeze([
  Object.freeze({ trap: "Forming", control: "examples and counterexamples" }),
  Object.freeze({ trap: "Assumption", control: "examples and counterexamples" }),
  Object.freeze({ trap: "Dislodging", control: "revisiting an approach" }),
  Object.freeze({ trap: "Achievement", control: "revisiting an approach" }),
  Object.freeze({ trap: "Location", control: "stage awareness" }),
  Object.freeze({ trap: "Progression", control: "prerequisite questions" }),
  Object.freeze({ trap: "Interruption", control: "pull-based hints" }),
  Object.freeze({ trap: "Mislead", control: "source and test checks" }),
]);
