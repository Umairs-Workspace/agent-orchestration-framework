// 179/02 task 01 — the teaching session opens by telling the human, in a line, that they write the
// code, and holds that on every turn (amended at 188/F-14: it talks to a person, not an auditor). Read against the package's own prompt, flattened, and cut into its marked regions so a
// reordered paragraph cannot move a control (179/ARCHITECTURE ADR-003, ADR-005).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TEACH = new URL("../assets/commands/teach.md", import.meta.url);

const flattened = (value) => String(value).replace(/<!--[^]*?-->/gu, " ").replace(/\s+/gu, " ").trim();
const source = () => readFileSync(TEACH, "utf8");

// One marked region of the prompt, flattened; a missing region fails as NOT FOUND. The tags are
// matched at line start, because step 6 spells `<opening>`, `<voice>` and `<guidance>` inline.
function region(name) {
  const match = new RegExp(`^<${name}>$([^]*?)^</${name}>$`, "mu").exec(source());
  assert.ok(match, `teach.md: NOT FOUND — the <${name}> region could not be cut`);
  return flattened(match[1]);
}

export const teachFrameTests = [
  {
    name: "188/02 E1 (@finding-F-14) · the opening is a short structured header, then the first question",
    run: () => {
      assert.match(region("process"), /\*\*Open\*\* \(`<opening>`\)/u);
      const opening = region("opening");
      assert.match(opening, /The session opens with a short, structured header, then the first question\.\*\* It has five labelled parts, in this order/u);
      const parts = ["Teaching mode:", "Objective:", "The work:", "Where it stands:", "First question:"].map((label) => opening.indexOf(`**${label}**`));
      assert.ok(parts.every((at) => at >= 0), "the header names all five parts");
      assert.deepEqual([...parts].sort((a, b) => a - b), parts, "the parts appear in order");
      assert.match(opening, /the exits are `aof:continue <ref>` and `aof:manual <ref>`/u);
      assert.match(opening, /Nothing else goes in the opening\.\*\* It names no run record, sync queue, test scope, permission setting, command internals or ADR, fitness-function or finding id, and it prints no outcome line/u);
      assert.doesNotMatch(source(), /<banner>/u, "the recited banner is gone");
    },
  },
  {
    name: "188/02 E10 (@finding-F-14) · what AOF writes is told when asked, and never denied",
    run: () => {
      const opening = region("opening");
      assert.match(opening, /What AOF writes is told when asked, and never denied\.\*\* Asked what AOF does or writes, the session answers plainly/u);
      for (const write of ["moved the story to in-progress", "`runs/<node>/*.json`", "`.aof/artifact-sync-queue.ndjson`", "`STATE.md`"]) {
        assert.ok(opening.includes(write), `the answer names the write ${write}`);
      }
      assert.match(opening, /The session is never described as making no writes/u);
    },
  },
  {
    name: "188/02 E7 (@finding-F-14) · the session talks to a person and shows them none of AOF's machinery",
    run: () => {
      const voice = region("voice");
      assert.match(voice, /Talk to a person who wants to learn, the way a good mentor pairing with them would/u);
      assert.match(voice, /Never show the human AOF's machinery\.\*\* No run ids or paths, no "the door", no test-scope flags, no ADR, fitness-function or finding ids/u);
      assert.match(voice, /Never ask a comprehension check for its own sake/u);
      assert.match(voice, /Keep every reply short:\*\* a few sentences and one question/u);
      assert.match(region("objective"), /The reader is a person who wants to learn, never a reviewer checking compliance/u);
    },
  },
  {
    name: "188/02 E8 (@finding-F-14) · the story's own tests run once, and only its results are told",
    run: () => {
      const process = region("process");
      assert.match(process, /When the test files among `files:` exist, run `aof test --scope file <those files>` once/u);
      assert.match(process, /Never widen the run to the repository, and never run it again to shorten its output/u);
      assert.doesNotMatch(process, /--scope impacted/u, "the session no longer widens to the impacted scope");
      assert.match(region("voice"), /A failure outside the story's files is not theirs to hear about/u);
    },
  },
  {
    name: "188/02 E9 (@finding-F-14) · the first turn ends on its question, with no outcome line",
    run: () => assert.match(region("output"), /The command's own turn ends on its first question, with no outcome line\.\*\* An outcome is said in a plain sentence or two when the session reaches it/u),
  },
  {
    name: "179/02 E2 · \"just write it\" is answered with the exits, never by complying",
    run: () => {
      const boundary = region("boundary");
      assert.match(boundary, /This holds in every turn of the session, not only the first/u);
      assert.match(boundary, /AOF edits no file under `files:`, spawns no developer and applies no fix/u);
      assert.match(boundary, /A request to write the code, at any rung and in any wording, is answered by naming the exits, never by complying:\*\* `aof:continue <ref>`[^]*`aof:manual <ref>`/u);
    },
  },
  {
    name: "179/02 E3 · the strongest help is explanation in the terminal",
    run: () => assert.match(region("boundary"), /Every rung of help is given in the terminal, and none writes a file/u),
  },
  {
    name: "179/02 E4 · a resumed session is not a teaching session",
    run: () => {
      const process = region("process");
      assert.match(process, /A resumed or re-entered session is not a teaching session until `aof:teach <ref>` is invoked again\*\*, and no mode is read from a run record or a transcript/u);
    },
  },
  {
    name: "179/02 the boundary is claimed honestly",
    run: () => {
      const boundary = region("boundary");
      assert.match(boundary, /When the human asks whether the boundary is enforced, or relies on it as a lock, tell them plainly that it is the session's instruction and not an enforced restriction/u);
      assert.match(boundary, /It is never claimed as enforcement/u);
      assert.match(boundary, /A project-level `permissions\.deny` on `Edit` and `Write`[^.]*is the operator's own option/u);
      assert.match(boundary, /it does not cover shell writes/u);
    },
  },
  {
    name: "179/02 E5 · a green build hands back to review",
    run: () => assert.match(region("output"), /\*\*taught: `<ref>` is yours to build\*\* — [^-]*Next: `aof:review <ref>`, once the human's build is green — never `aof:verify`/u),
  },
  {
    name: "179/02 E6 · a hand-off to an agent is written into STATE first",
    run: () => {
      const handOff = region("hand_off");
      assert.match(handOff, /When the human asks to hand the story to an agent, the session appends `- <date> — Hand-off <ref> from teach:` under `## Notes & decisions in flight` in the item's `STATE\.md`/u);
      assert.match(handOff, /listing the `files:` the human changed, their commits since the run was minted, and the scenarios green and red/u);
      assert.match(handOff, /The session then closes its run `done`(?: \([^)]*\))? and names `aof:continue <ref>`, saying the build will start from the human's files and report each human-written line it changes/u);
    },
  },
  {
    name: "188/02 task 02 (@finding-F-02) E1 · a session that ends without stop, green or hand-off strands no open run",
    run: () => {
      const process = region("process");
      assert.match(process, /Close it before this command's own turn ends\*\*, after the opening and the first question, whatever the human says next/u);
      assert.match(process, /No teaching run is ever left open for a later turn:\*\* a session may simply end, without a stop, a green build or a hand-off/u);
      assert.match(process, /Close the run with `aof work run-complete <ref> --outcome done`, never `failed`/u, "the close is still done, never failed");
      assert.doesNotMatch(process, /Close it when the human stops, when the scenarios are green, or at a hand-off/u, "the close no longer waits for an event a session may never reach");
    },
  },
  {
    name: "188/02 task 02 (@finding-F-02) E2 · review after a teaching session is not refused by that session's run",
    run: () => {
      const process = region("process");
      assert.match(process, /An open run then refuses the next command on the story, `aof:review <ref>`, as `duplicate-run`/u);
      const close = process.indexOf("Close it before this command's own turn ends");
      const opening = process.indexOf("**Open** (`<opening>`)");
      assert.ok(opening >= 0 && close > opening, "the close follows the opening, inside the command's own turn");
      const review = flattened(readFileSync(new URL("../../core/assets/commands/review.md", import.meta.url), "utf8"));
      assert.match(review, /usually after `aof:manual <ref>` handed them a guide, or after `aof:teach <ref>` taught them through it/u);
      assert.match(review, /Either command may have made the story's run and status move\. Do not assume it was `aof:manual`/u);
    },
  },
  ...[
    [/this command.s first act\.\*\* Run `aof work continue <ref> --teach --json`[^]*A door refusal ends the session with nothing minted/u, "the door is the first act, and a refusal mints nothing"],
    [/A `continue-teach-not-a-story` refusal for a milestone or a `NN\/MM-PP` span runs `aof work next <ref> --json` and names the ready stories/u, "not-a-story names the ready stories"],
    [/This session does not walk the re-entry sweep and never runs `aof work resume`/u, "no re-entry sweep, no resume"],
    [/Mint the run with `aof work run-start <ref> --json` before anything is printed/u, "the run is minted before anything is printed"],
    [/Close the run with `aof work run-complete <ref> --outcome done`, never `failed`/u, "the run closes done, never failed"],
    [/A story whose `reads:` is absent, or whose tasks are thin or untagged, halts and sends the operator to `aof:refine <ref>`/u, "an unrefined story halts to aof:refine"],
  ].map(([rule, label]) => ({
    name: `179/02 the teach command holds each entry and run rule [${label}]`,
    run: () => assert.match(region("process"), rule),
  })),
  {
    name: "179/02 the order holds: the door, then the mint, then the opening",
    run: () => {
      const process = region("process");
      const door = process.indexOf("aof work continue <ref> --teach --json");
      const mint = process.indexOf("aof work run-start <ref> --json");
      const opening = process.indexOf("**Open** (`<opening>`)");
      assert.ok(door >= 0 && mint > door && opening > mint, "door → mint → opening");
    },
  },
];
