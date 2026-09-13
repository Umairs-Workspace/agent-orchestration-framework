// test/support/workflow/workflow-lint.mjs — the ONE read boundary for a static lint over a checked-in
// GitHub Actions workflow (story 125, at review: this story's Pages lint had copied these two
// functions from the release lint that established them, and the copy is the shape the repository
// refuses — a second home for a rule whose whole value is that it is applied the same way twice).
//
// LINE ENDINGS ARE NORMALISED AT THE READ BOUNDARY, and it is not cosmetic. `stripYamlComments`
// strips with `/#.*$/` per split line. On a CRLF checkout every split line ends with `\r`, which is
// a line terminator to a JS regex: `.` will not cross it and a non-multiline `$` will not match
// before it, so the replace matches NOTHING and not one comment is stripped. The lint then reads the
// workflow's own explanatory prose as if it were configuration — the release lint's `/03` saw the
// comment stating that a Linux-arm64 QEMU container is NEVER used and reported a QEMU directive,
// and its `/09` could not pair `arch:`/`runner:` across an interleaved comment the stripping exists
// to remove. Both were red on Windows and green on Linux, for a fact about the checkout rather than
// about the workflow. Story 125's task 00 made the normalisation a criterion rather than a
// convention; this module is where the criterion is met, for every lint that reads a workflow.
//
// NO YAML PARSER, DELIBERATELY. These are comment-stripped, line-anchored text assertions over the
// checked-in source, mirroring the grep-based arch-test convention throughout test/arch/; a parser
// dependency for a lint-only concern is what both lints declined to add.
import { readFileSync } from "node:fs";

// CRLF → LF, once, at the boundary. Every function below assumes its input has passed through this.
export function normaliseEol(text) {
  return text.split("\r\n").join("\n");
}

// The workflow's text as the lint reads it: from disk, normalised.
export function readWorkflowText(file) {
  return normaliseEol(readFileSync(file, "utf8"));
}

// Strip YAML `#` comments per line, so an assertion is never fooled by a commented-out example or
// by prose naming the very token it looks for. Correct ONLY over normalised text — see the header.
export function stripYamlComments(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/#.*$/, ""))
    .join("\n");
}
