// THE WORK/RECORD SUITES — this directory's index, and the ONE place its membership is
// written down (119/03, ADR-010). The registry names directories; a directory names its own
// suites. A new suite here is one import and one spread IN THIS FILE, and `scripts/test.mjs`
// is unchanged by its arrival.
//
// Membership is IMPORTED AND SPREAD, never derived: no `readdir` decides what belongs here.
// `registrationDecision` (`src/work-audit/census.mjs`) stays the single decider of which file
// contributed which entries, and this file is one of its inputs rather than a second answer.
// Every binding the registry spread for a suite is spread here — including both of the two
// that four suites in this tree export, which a one-binding-per-file index would halve.

// story 65 — CONCURRENT STORY DISPATCH. A milestone should finish in the time of its
// longest story rather than the sum of all of them; measured, vista-app-web 352 spent
// 10h11m of a 25h12m span on serialisation alone, six developer builds at 1.00×.
// Task 00: a story's `depends` names a SIBLING and both readers finally read it — validate
// REPORTS an edge resolving to no sibling, `next` IGNORES it (one rule, two renderings).
// Task 01: `aof work next` answers with the whole READY SET, strictly additively — the
// existing single-item keys keep their places and their meanings, and the stamp that says
// which side answered a row is applied PER MEMBER.
// Task 02: the set is dispatched concurrently, each story in its own worktree on the item's
// own branch, bounded by ONE configured key with ONE default and ONE resolution site
// (acd-dispatch-bound-single-home). Its @manual scenario — a real milestone measuring above
// 1.00× — has no test file here and is verified at the gate.
import { workStoryDependsTests } from "./work-story-depends.test.mjs";
// THE STORY-SPAN REF (`NN/MM-PP`) — an operator naming a SLICE of a milestone to drive.
// Both admitting surfaces in one suite (`findWork` resolves the ref, `nextWork` scopes the
// walk), including the rule that keeps the form safe to hand to `aof:continue`: a span
// never offers its milestone for acceptance, because the stories outside it were never read.
import { workStorySpanScopeTests } from "./work-story-span-scope.test.mjs";
// milestone 66 / story 02 — THE CONTROLS LANE (ADR-003 §2/§3). `work:doctor` gains one
// lane carrying all three register/verification/resolution check-groups, with a frozen
// eight-code envelope. The groups are pure `(snapshot, ctx) => Finding[]`, so the
// traceability suite drives every scenario from a LITERAL in-memory snapshot with no
// filesystem — that is the property, not the convenience. FF-6605 + FF-6606 + FF-6607
// are the story's own fitness functions (ADR-007 §1), each with its planted-defect
// lane; FF-6607's second half parses THIS milestone's own register with the shipped
// recogniser, so a row added to it without a file fails immediately (m22/R1).
import { workDoctorControlsTests } from "./work-doctor-controls.test.mjs";
import { workDoctorTests } from "./work-doctor.test.mjs";

export const tests = [
  // story 65 — concurrent story dispatch (tasks 00–02; task 02's last scenario is @manual)
  ...workStoryDependsTests,
  ...workStorySpanScopeTests,
  // milestone 66 / story 02 — the controls lane (tasks 00–03) + its three fitness functions
  ...workDoctorControlsTests,
  ...workDoctorTests,
];
