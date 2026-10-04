import path from "node:path";





import { mapToken, readMapToken } from "./map.mjs";


export function createExampleAnswers({ HUMAN_INPUT_TOOL_NAMES, reportDegrade, readRuns, isRunning, readTranscriptTree, claudeProjectsDir }) {

// THE ANCHOR — a person's answer, read from the harness transcript (milestone 134 / ADR-003,
// FF-13401).
//
// An example map may label an example `confirmed` or `stated` only when a person agreed to it, and
// the label is checked against a record the agent did not write: the harness's own
// `toolUseResult` on the `user` line that answers a human-input tool call (RESEARCH R1). If two
// modules read that record they can disagree about what counts as an answer, so this module is the
// one reader. FF-13401 (`test/arch/examples/acd-example-answer-one-reader.test.mjs`) holds the rest
// of `src/**` to that.
//
// WHAT COUNTS (task 00's rulings). A result links to its call only through `tool_use_id` = the id
// of an asking `tool_use` block whose name is in `HUMAN_INPUT_TOOL_NAMES` — the name is imported
// from its one home, never spelt here. Only an OBJECT `toolUseResult` on a result that is not
// `is_error` can yield a record (a refusal is the string "User rejected tool use"). An `answers`
// key counts only when it is the text of a question the asking block asked, and only when that
// question opens with a map token (`readMapToken`, story 02). The answer is kept verbatim.
//
// A record names the channel, never a person: `{ token, question, answer, toolUseId, sessionId,
// at, entrypoint }` — the person at that session's harness, through that entrypoint (RESEARCH R3).
//
// Transcripts are pruned and live on one machine (RESEARCH R6), so the answers are stamped once
// onto the run record at settle (`recordAnswers` in `src/run-store.mjs`, called by `completeRun`)
// and `collectAnswers` reads the stamp for a settled run and this same reader for a running one.


const nonEmptyString = (value) => typeof value === "string" && value.length > 0;

// The question texts an asking block asked, in the order it asked them.
function questionsAsked(input) {
  const questions = Array.isArray(input?.questions) ? input.questions : [];
  return questions.map((entry) => entry?.question).filter(nonEmptyString);
}

/**
 * Read the tokened answers out of a transcript's text. Pure and total: anything that is not a
 * transcript it can read answers `[]`, and it never throws. Records come in transcript line order,
 * and within one call in the order the call asked its questions.
 */
function readAnswers(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const asked = new Map();
  const records = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a line that is not JSON is skipped; the lines around it are still read
    }
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    if (entry.type === "assistant") {
      for (const block of content) {
        if (block?.type === "tool_use" && HUMAN_INPUT_TOOL_NAMES.includes(block.name) && nonEmptyString(block.id)) {
          asked.set(block.id, questionsAsked(block.input));
        }
      }
      continue;
    }
    if (entry.type !== "user") continue;
    const result = entry.toolUseResult;
    if (result == null || typeof result !== "object" || Array.isArray(result)) continue;
    const answers = result.answers;
    if (answers == null || typeof answers !== "object" || Array.isArray(answers)) continue;
    // A line that cannot say which session answered, or when, supports no record — and one such
    // record would make the writer refuse the whole stamp.
    if (!nonEmptyString(entry.sessionId) || !nonEmptyString(entry.timestamp)) continue;
    for (const block of content) {
      if (block?.type !== "tool_result" || block.is_error === true) continue;
      const questions = asked.get(block.tool_use_id);
      if (!questions) continue;
      for (const question of questions) {
        if (!Object.hasOwn(answers, question)) continue;
        const answer = answers[question];
        if (!nonEmptyString(answer)) continue;
        const head = readMapToken(question);
        if (!head) continue;
        records.push({
          token: mapToken(head.storyRef, head.id),
          question,
          answer,
          toolUseId: block.tool_use_id,
          sessionId: entry.sessionId,
          at: entry.timestamp,
          entrypoint: nonEmptyString(entry.entrypoint) ? entry.entrypoint : null,
        });
      }
    }
  }
  return records;
}

/**
 * Read a session's tokened answers from its whole transcript tree. Answers `null` when the session
 * has no readable transcript there — the settle reports that — and the records otherwise, which may
 * be none ("nothing to record" is not a fault).
 */
async function readSessionAnswers(projectsDir, sessionId) {
  if (!nonEmptyString(projectsDir) || !nonEmptyString(sessionId)) return null;
  const body = await readTranscriptTree(projectsDir, sessionId);
  return body == null ? null : readAnswers(body);
}

// The transcript directory a live read uses: the caller's, else the one Claude Code keeps for the
// named workspace's root — the same resolution the settle seam makes (task 02).
function transcriptDirFor({ projectsDir, workspace, env = process.env, home } = {}) {
  if (nonEmptyString(projectsDir)) return projectsDir;
  if (!nonEmptyString(workspace?.projectRoot)) return null;
  return claudeProjectsDir({ cwd: workspace.projectRoot, env, ...(home ? { home } : {}) });
}

// THE LOOP'S ANSWER — a person's answer recorded on the run itself (milestone 136 / ADR-001,
// FF-13601). Under a driving shell the question goes out as 131's ask and the answer comes back
// through `aof work answer`, the board or a Discord reply; the run's owner writes it onto the run
// record's `asks` (`answerRunAsk`) and the harness writes no `toolUseResult` for it. An entry
// anchors only when it is answered and its question names exactly ONE token: one at its head, and
// none at the head of any later line — 131's answer is one text, and nothing can say which part of
// it settled which of two tokens (§2). Every channel counts (136/01 Q1); `by` names it.
// Pure and total, as `readAnswers` is: a malformed `asks` yields nothing and never throws.
function readAskAnswers(run) {
  const asks = Array.isArray(run?.asks) ? run.asks : [];
  const records = [];
  for (const entry of asks) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const { question, answer, answeredAt } = entry;
    if (!nonEmptyString(question) || !nonEmptyString(answer) || !nonEmptyString(answeredAt)) continue;
    const [first, ...rest] = question.split("\n");
    const head = readMapToken(first);
    if (!head || rest.some((line) => readMapToken(line) != null)) continue;
    records.push({
      key: ["ask", run.runId ?? null, entry.askedAt ?? null],
      record: {
        token: mapToken(head.storyRef, head.id),
        question,
        answer,
        toolUseId: null,
        sessionId: nonEmptyString(run.sessionId) ? run.sessionId : null,
        at: answeredAt,
        entrypoint: null,
        by: entry.by ?? null,
      },
    });
  }
  return records;
}

// A story's parent milestone as a run-store item: its ref's head, and the folder that holds the
// story's `stories/` folder.
function parentOf(story) {
  const [head, tail] = String(story?.ref ?? "").split("/");
  if (!tail || !nonEmptyString(story?.dir)) return null;
  return { ref: head, dir: path.dirname(path.dirname(story.dir)) };
}

/**
 * A story's answers, wherever they live: the stamps of the settled runs of the story and of its
 * parent milestone, for a run still `running` what this reader returns live from that run's
 * session, and — for every run, in any state — the answered loop asks on its record (136/ADR-001).
 * Only records whose token names the story; a harness answer de-duplicated on `(toolUseId,
 * question)`, an ask on its run and `askedAt`; ordered by `at`, ties keeping the stamp's own order.
 *
 *   opts — { projectsDir } or { workspace, env, home } for the live read; { parent } to name the
 *          parent item rather than derive it from the story's folder.
 */
async function collectAnswers(story, opts = {}) {
  const items = [story, opts.parent ?? parentOf(story)].filter((item) => nonEmptyString(item?.dir));
  const dir = transcriptDirFor(opts);
  const found = [];
  const harness = (record) => ({ key: [record?.toolUseId, record?.question], record });
  for (const item of items) {
    for (const run of await readRuns(item)) {
      if (isRunning(run)) {
        if (dir && nonEmptyString(run.sessionId)) {
          try {
            found.push(...((await readSessionAnswers(dir, run.sessionId)) ?? []).map(harness));
          } catch (error) {
            // A live read that fails answers nothing for that run, and says so; the stamps still stand.
            reportDegrade("example-answers", error);
          }
        }
      } else if (Array.isArray(run.brief?.answers)) {
        found.push(...run.brief.answers.map(harness));
      }
      found.push(...readAskAnswers(run));
    }
  }
  const seen = new Set();
  const mine = [];
  for (const { key, record } of found) {
    if (readMapToken(record?.token)?.storyRef !== story.ref) continue;
    const id = JSON.stringify(key);
    if (seen.has(id)) continue;
    seen.add(id);
    mine.push(record);
  }
  return mine.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

return { readAnswers, readSessionAnswers, collectAnswers };
}
