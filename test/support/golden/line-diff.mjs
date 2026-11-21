// test/support/golden/line-diff.mjs — a unified line diff over an LCS, with no package added
// (203/ADR-004 §3). `git diff --no-index` was rejected because its output follows the user's
// git config; this one prints the same hunks on every machine.

const NO_NEWLINE = "\\ No newline at end of file";

// A text as diff lines. A missing final newline is a line of its own, so two texts that differ
// only there still show a hunk.
function linesOf(text) {
  if (text == null || text === "") return [];
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  else lines.push(NO_NEWLINE);
  return lines;
}

// The edit script, as [op, line] pairs with op " ", "-" or "+". A common prefix and suffix are
// peeled before the quadratic table, so a one-line edit in a long file costs one small table.
function editScript(a, b) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = a.slice(0, start).map((line) => [" ", line]);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      ops.push([" ", midA[i]]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push(["-", midA[i]]);
      i += 1;
    } else {
      ops.push(["+", midB[j]]);
      j += 1;
    }
  }
  while (i < n) ops.push(["-", midA[i++]]);
  while (j < m) ops.push(["+", midB[j++]]);
  for (const line of a.slice(endA)) ops.push([" ", line]);
  return ops;
}

const range = (startLine, count) => (count === 1 ? `${startLine}` : `${count === 0 ? startLine - 1 : startLine},${count}`);

// unifiedDiff(oldText, newText, { oldLabel, newLabel, context }) → the diff as text, or "" when
// the texts are equal. A null text is "nothing": an added file is diffed against /dev/null.
export function unifiedDiff(oldText, newText, { oldLabel = "a", newLabel = "b", context = 3 } = {}) {
  const ops = editScript(linesOf(oldText), linesOf(newText));
  const changed = ops.flatMap(([op], index) => (op === " " ? [] : [index]));
  if (changed.length === 0) return "";

  // Group changes whose context windows touch into one hunk.
  const hunks = [];
  for (const index of changed) {
    const last = hunks.at(-1);
    if (last && index - last.end <= context * 2 + 1) last.end = index;
    else hunks.push({ start: index, end: index });
  }

  const out = [`--- ${oldText == null ? "/dev/null" : oldLabel}`, `+++ ${newText == null ? "/dev/null" : newLabel}`];
  // Line numbers at each op index, for the hunk headers.
  const oldAt = [];
  const newAt = [];
  let oldLine = 1;
  let newLine = 1;
  for (const [op, line] of ops) {
    oldAt.push(oldLine);
    newAt.push(newLine);
    if (line === NO_NEWLINE) continue;
    if (op !== "+") oldLine += 1;
    if (op !== "-") newLine += 1;
  }
  for (const hunk of hunks) {
    const from = Math.max(0, hunk.start - context);
    const to = Math.min(ops.length - 1, hunk.end + context);
    const body = ops.slice(from, to + 1);
    const counted = body.filter(([, line]) => line !== NO_NEWLINE);
    const oldCount = counted.filter(([op]) => op !== "+").length;
    const newCount = counted.filter(([op]) => op !== "-").length;
    out.push(`@@ -${range(oldAt[from], oldCount)} +${range(newAt[from], newCount)} @@`);
    for (const [op, line] of body) out.push(line === NO_NEWLINE ? line : `${op}${line}`);
  }
  return `${out.join("\n")}\n`;
}
