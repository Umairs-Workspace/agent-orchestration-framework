// Traceability wiring for milestone 03 / story 01 (the work board).
//
// Covers EVERY @executable scenario across the five task features, exercising
// the REAL server-side `/api/work*` endpoints (board-ui.mjs wired into
// serveSetupUi) against temp fixture repos — never the UI, never a mock server.
//
//   00_board-renders-stream.feature  — list serves the flat 7-field contract
//   01_detail-shows-records.feature  — doc returns body / absent-not-error
//   02_add-feedback.feature          — one bullet / verbatim heading / refs /
//        second beneath first / raw-ledger+STATE changes / routes milestone+story
//   03_validate-stream.feature       — findings / clean→empty / scoped /
//        changes-no-files
//   04_next-item.feature             — ready/blocked/done / waitingOn /
//        changes-no-files
import assert from "node:assert/strict";
import { assertFrozenShape, assertAnswersFrom } from "../support/answering-side.mjs";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveSetupUi } from "../../src/setup-ui.mjs";
// 127/04 task 02 — the include-archived parameter, driven over the REAL board face on a
// three-root stream (the m43 fixture, which learned the two roots for this story), the REAL
// <Board/> for the client's URL composition, and the CLI as a child process for the frozen face.
import { withBoardFace, DEFAULT_STREAM } from "../support/board-face-fixture.mjs";
import { withBoardApp, findAll } from "../support/board-app-harness.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import http from "node:http";
import { loadWorkspace } from "../../src/command-core.mjs";
import { resolveWorkspaceId } from "../../src/workspace-identity.mjs";
import { loopAsksDir, openAsk, clearAsk, readAsk, answerAsk, askRequestPath } from "../../src/loop/ask-request.mjs";
import { matchedBraceBody } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "bin", "aof.mjs");

// The task's stream: the default milestone 43 (four stories) and gate 44, plus a backlog
// (a root milestone and a grouped chore) and an archive (a milestone with one story, and a uat).
const THREE_ROOT_STREAM = {
  ...DEFAULT_STREAM,
  backlog: [
    { type: "milestone", slug: "search-the-fleet", title: "Search the fleet", group: "" },
    { type: "chore", slug: "prune-logs", group: "ops/later" },
  ],
  archived: [
    { type: "milestone", number: "12", slug: "theta", title: "Theta", status: "done", stories: [{ number: "00", slug: "theta-one", title: "Theta one", status: "done" }] },
    { type: "uat", number: "13", slug: "accept-theta", title: "Accept theta", status: "done" },
  ],
};

// --- fixture builders --------------------------------------------------------

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-board-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8"
  );
  return { repo, workDir };
}

function frontmatter(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

async function milestone(workDir, { number, slug, status, title, depends }) {
  const dir = path.join(workDir, `${number}_milestone_${slug}`);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SPEC.md"),
    frontmatter({
      type: "milestone",
      number,
      slug,
      status,
      title: `"${title}"`,
      created: "2026-06-19",
      updated: "2026-06-19",
      schema: 1,
      ...(depends ? { depends: `[${depends}]` } : {}),
    }) + `# ${number} · ${title}\n`,
    "utf8"
  );
  return dir;
}

async function story(workDir, milestoneFolder, { number, slug, status, title, parent }) {
  const dir = path.join(workDir, milestoneFolder, "stories", `${number}_story_${slug}`);
  await mkdir(path.join(dir, "tasks"), { recursive: true });
  await writeFile(
    path.join(dir, "STORY.md"),
    frontmatter({
      type: "story",
      number,
      slug,
      status,
      title: `"${title}"`,
      parent,
      created: "2026-06-19",
      updated: "2026-06-19",
      schema: 1,
    }) + `# ${number} · ${title}\n`,
    "utf8"
  );
  return dir;
}

// --- server harness ----------------------------------------------------------

async function withServer(repo, body) {
  const { server, url } = await serveSetupUi(null, { projectDir: repo, port: 0 });
  try {
    return await body(url);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const getJson = async (url, route) => {
  const response = await fetch(new URL(route, url));
  return { status: response.status, body: await response.json() };
};

// --- snapshot helper (for "changes-no-files" scenarios) ----------------------

async function snapshotDir(dir) {
  const snap = new Map();
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const info = await stat(full);
        snap.set(full, `${info.mtimeMs}:${await readFile(full, "utf8")}`);
      }
    }
  }
  await walk(dir);
  return snap;
}

function diffSnapshots(before, after) {
  const changed = [];
  for (const [file, value] of after) {
    if (before.get(file) !== value) changed.push(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changed.push(file);
  }
  return changed;
}

// --- bullets under the feedback heading --------------------------------------

function bulletsUnderHeading(stateText) {
  const lines = stateText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === "## Feedback (for retro)");
  if (headingIndex === -1) return [];
  const bullets = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s/.test(lines[i])) break;
    const line = lines[i];
    // Skip the template's placeholder/comment bullet and HTML comment lines.
    if (line.trim().startsWith("- ") && !line.includes("<note>")) bullets.push(line);
  }
  return bullets;
}

export const boardApiTests = [
  // ===================== 00_board-renders-stream.feature =====================
  {
    name: "board-api/00 the list endpoint serves the flat work-list contract",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const m00 = await milestone(workDir, { number: "00", slug: "work-cli", status: "done", title: "The work CLI" });
        const m03 = await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await milestone(workDir, { number: "04", slug: "work-memory", status: "not-started", title: "Work memory" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        void m00; void m03;

        await withServer(repo, async (url) => {
          const { status, body: envelope } = await getJson(url, "/api/work/list");
          assert.equal(status, 200);
          // m43 / story 04 (ADR-010/R4.1) — the board ROUTE answers the envelope
          // `{ items, stalenessSeconds }`: the cache-staleness window is ONE number for
          // the whole response, so it has no honest home on a row. The ROW contract below
          // is UNCHANGED and is still the subject of this scenario — it simply reads one
          // level down. (`aof work list --json` stays the flat array; that split is R4.1's
          // whole point and is asserted by acd-work-list-contract.)
          const body = envelope.items;
          // a flat JSON array, not a nested tree
          assert.ok(Array.isArray(body), "the rows are a flat JSON array, not a nested tree");
          assert.ok(!body.some((item) => "children" in item), "no element carries a nested children edge");
          // every element carries the seven contract fields — and, since m43 / story 06
          // (ADR-005 rule 3, "every row says which side answered it"), the answering-side stamp
          // beside them. `assertFrozenShape` holds the guarantee the exact-key form encoded: no
          // frozen key renamed, dropped or retyped, and no addition other than that one stamp.
          const expected = ["ref", "type", "slug", "status", "title", "parent", "dir"];
          for (const item of body) {
            assertFrozenShape(item, expected, `element ${item.ref} carries the 7 contract fields`);
            assertAnswersFrom(item, null, `element ${item.ref}`);
          }
          // depth-0 items 00, 03, 04 have a null/absent parent
          for (const ref of ["00", "03", "04"]) {
            const item = body.find((entry) => entry.ref === ref);
            assert.ok(item, `depth-0 item ${ref} present`);
            assert.equal(item.parent, null, `depth-0 item ${ref} has a null parent`);
          }
          // 03/01 carries a parent that resolves to another element's ref
          const child = body.find((entry) => entry.ref === "03/01");
          assert.ok(child, "story 03/01 present");
          assert.equal(child.parent, "03");
          assert.ok(body.some((entry) => entry.ref === child.parent), "parent 03 resolves to another element's ref");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ===================== 01_detail-shows-records.feature =====================
  {
    name: "board-api/01 the doc endpoint returns the requested document body",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const m = await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        void m;
        const storyBody = await readFile(path.join(storyDir, "STORY.md"), "utf8");
        await writeFile(path.join(storyDir, "VERIFICATION.md"), "# verification\n", "utf8");

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/doc?ref=03/01&doc=STORY");
          assert.equal(status, 200);
          assert.equal(body.present, true);
          assert.equal(body.body, storyBody, "the response carries the body of STORY.md from the item directory");
          assert.equal(body.ref, "03/01");
          assert.equal(body.doc, "STORY");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/01 a document the item lacks is reported as absent, not an error",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        // no RETROSPECTIVE.md written

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/doc?ref=03/01&doc=RETROSPECTIVE");
          assert.equal(status, 200, "the response is not an error");
          assert.equal(body.present, false, "the response indicates the document is absent");
          assert.equal(body.body, "");
          assert.notEqual(body.ok, false, "no error envelope");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ===================== 02_add-feedback.feature =============================
  {
    name: "board-api/02 the feedback endpoint appends one attributed bullet in the documented format",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        // STATE.md already has the heading with no entries
        await writeFile(path.join(storyDir, "STATE.md"), "# 01 · State\n\n## Feedback (for retro)\n\n", "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "spec was ambiguous on the empty state", actor: "qa" }),
          });
          const body = await response.json();
          assert.equal(response.status, 200);
          assert.equal(body.ok, true);

          const stateText = await readFile(path.join(storyDir, "STATE.md"), "utf8");
          const bullets = bulletsUnderHeading(stateText);
          assert.equal(bullets.length, 1, "exactly one new bullet is appended under the heading");
          assert.equal(bullets[0], "- spec was ambiguous on the empty state — Raised by: qa", "bullet reads in the documented format");
          assert.ok(bullets[0].includes("Raised by: qa"), "the bullet is attributed to the qa actor");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 the feedback append creates the heading verbatim when it is absent",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        // STATE.md with no feedback heading
        await writeFile(path.join(storyDir, "STATE.md"), "# 01 · State\n\n## Progress\n\n- [ ] something\n", "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "the loading copy reads oddly", actor: "qa" }),
          });
          assert.equal(response.status, 200);

          const stateText = await readFile(path.join(storyDir, "STATE.md"), "utf8");
          assert.ok(stateText.includes("## Feedback (for retro)"), "a verbatim heading is created");
          assert.ok(stateText.includes("## Progress"), "the existing body is preserved");
          const bullets = bulletsUnderHeading(stateText);
          assert.equal(bullets.length, 1, "exactly one bullet is appended under it");
          assert.equal(bullets[0], "- the loading copy reads oddly — Raised by: qa");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 a supplied Refs pointer is recorded verbatim on the bullet",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        await writeFile(path.join(storyDir, "STATE.md"), "## Feedback (for retro)\n\n", "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "revisit the chip ramp", actor: "qa", refs: "DESIGN §1" }),
          });
          assert.equal(response.status, 200);

          const stateText = await readFile(path.join(storyDir, "STATE.md"), "utf8");
          const bullets = bulletsUnderHeading(stateText);
          assert.equal(bullets.length, 1);
          assert.ok(bullets[0].endsWith("Refs: DESIGN §1"), "the appended bullet ends with the verbatim Refs pointer");
          // three spaces before Refs, em-dash, matching the canonical template
          assert.equal(bullets[0], "- revisit the chip ramp — Raised by: qa   Refs: DESIGN §1");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 a second note appends beneath the first without disturbing it",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        const firstBullet = "- existing note — Raised by: developer";
        await writeFile(path.join(storyDir, "STATE.md"), `## Feedback (for retro)\n\n${firstBullet}\n`, "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "second note", actor: "qa" }),
          });
          assert.equal(response.status, 200);

          const stateText = await readFile(path.join(storyDir, "STATE.md"), "utf8");
          const bullets = bulletsUnderHeading(stateText);
          assert.equal(bullets.length, 2, "there are now two bullets under the heading");
          assert.equal(bullets[0], firstBullet, "the existing bullet is unchanged");
          assert.equal(bullets[1], "- second note — Raised by: qa", "the new bullet appears beneath it");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 posting feedback writes the raw ledger and STATE projection, never item status",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        await writeFile(path.join(storyDir, "STATE.md"), "## Feedback (for retro)\n\n", "utf8");

        const before = await snapshotDir(workDir);
        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "only-write check", actor: "qa" }),
          });
          assert.equal(response.status, 200);
        });
        const after = await snapshotDir(workDir);
        const changed = diffSnapshots(before, after);
        assert.deepEqual(
          changed.sort(),
          [path.join(storyDir, "FEEDBACK.ndjson"), path.join(storyDir, "STATE.md")].sort(),
          "only the immutable raw ledger and STATE projection change",
        );

        // record-doc frontmatter + status unchanged
        const storyBefore = before.get(path.join(storyDir, "STORY.md"));
        const storyAfter = after.get(path.join(storyDir, "STORY.md"));
        assert.equal(storyBefore, storyAfter, "the item's record-doc frontmatter and status are unchanged");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 feedback routes to a milestone STATE log",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const mDir = await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await writeFile(path.join(mDir, "STATE.md"), "# 03 · State\n", "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03", note: "a note", actor: "qa" }),
          });
          assert.equal(response.status, 200);
          const stateText = await readFile(path.join(mDir, "STATE.md"), "utf8");
          assert.ok(stateText.includes("## Feedback (for retro)"), "the note lands under the heading in the milestone STATE.md");
          assert.equal(bulletsUnderHeading(stateText).length, 1);
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/02 feedback routes to a story STATE log",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        await writeFile(path.join(storyDir, "STATE.md"), "# 01 · State\n", "utf8");

        await withServer(repo, async (url) => {
          const response = await fetch(new URL("/api/work/feedback", url), {
            method: "POST",
            headers: { "content-type": "application/json", origin: new URL(url).origin },
            body: JSON.stringify({ ref: "03/01", note: "a note", actor: "qa" }),
          });
          assert.equal(response.status, 200);
          const stateText = await readFile(path.join(storyDir, "STATE.md"), "utf8");
          assert.ok(stateText.includes("## Feedback (for retro)"), "the note lands under the heading in the story STATE.md");
          assert.equal(bulletsUnderHeading(stateText).length, 1);
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ===================== /api/work/tasks (story TASKS tab) ==================
  {
    name: "board-api/tasks the tasks endpoint parses a story's tasks/*.feature with lanes + counts",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        // Two task features. 02 sorts after 01; the endpoint sorts by filename.
        // Feature carries @executable; the @manual scenario has NO competing
        // feature-level verification tag of its own — but feature @executable IS
        // in scope for it, so this file scopes lanes per-scenario instead.
        await writeFile(
          path.join(storyDir, "tasks", "01_list-endpoint.feature"),
          [
            "Feature: list endpoint",
            "",
            "  @executable",
            "  Scenario: serves the flat contract",
            "    Given a stream",
            "",
            "  @manual",
            "  Scenario: a hand-checked thing",
            "    Given something",
            "",
            "  @executable",
            "  Scenario Outline: each row",
            "    Given <x>",
          ].join("\n"),
          "utf8"
        );
        await writeFile(
          path.join(storyDir, "tasks", "02_uat-walkthrough.feature"),
          ["@uat", "Feature: walkthrough", "", "  Scenario: operator walks the board", "    Given the board"].join("\n"),
          "utf8"
        );

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/tasks?ref=03/01");
          assert.equal(status, 200);
          assert.equal(body.ref, "03/01");
          assert.equal(body.tasks.length, 2, "both task features are returned");
          // sorted by filename
          assert.deepEqual(body.tasks.map((t) => t.file), ["01_list-endpoint.feature", "02_uat-walkthrough.feature"]);

          const first = body.tasks[0];
          assert.equal(first.feature, "list endpoint");
          assert.equal(first.scenarios.length, 3);
          // feature-level @executable applies; the @manual scenario overrides via its own tag
          assert.equal(first.scenarios[0].lane, "executable");
          assert.equal(first.scenarios[1].lane, "manual");
          assert.equal(first.scenarios[2].lane, "executable");
          assert.equal(first.scenarios[2].outline, true, "the Scenario Outline is flagged");
          assert.deepEqual(first.counts, { executable: 2, manual: 1, uat: 0 });

          const second = body.tasks[1];
          assert.equal(second.feature, "walkthrough");
          assert.equal(second.scenarios[0].lane, "uat");
          assert.deepEqual(second.counts, { executable: 0, manual: 0, uat: 1 });
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/tasks a story with no tasks/ dir returns an empty list, not an error",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const mDir = await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        // A milestone has no tasks/ dir of its own.
        void mDir;

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/tasks?ref=03");
          assert.equal(status, 200, "the response is not an error");
          assertFrozenShape(body, ["ref", "tasks"], "the absent-tasks envelope");
          assert.equal(body.ref, "03");
          assert.deepEqual(body.tasks, [], "absent tasks/ → empty list");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/tasks the tasks endpoint changes no files (read-only)",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
        await writeFile(
          path.join(storyDir, "tasks", "01_thing.feature"),
          "@executable\nFeature: thing\n\n  Scenario: does\n    Given x\n",
          "utf8"
        );

        const before = await snapshotDir(workDir);
        await withServer(repo, async (url) => {
          const { status } = await getJson(url, "/api/work/tasks?ref=03/01");
          assert.equal(status, 200);
        });
        const after = await snapshotDir(workDir);
        assert.deepEqual(diffSnapshots(before, after), [], "no file in the work stream is changed");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ===================== 03_validate-stream.feature =========================
  {
    name: "board-api/03 the validate endpoint returns the validator's findings",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        // story folder slug disagrees with its frontmatter slug
        const storyDir = path.join(workDir, "03_milestone_work-board", "stories", "01_story_folder-slug");
        await mkdir(path.join(storyDir, "tasks"), { recursive: true });
        await writeFile(
          path.join(storyDir, "STORY.md"),
          frontmatter({
            type: "story",
            number: "01",
            slug: "frontmatter-slug", // disagrees with folder "folder-slug"
            status: "in-progress",
            title: '"Mismatched"',
            parent: "3",
            created: "2026-06-19",
            updated: "2026-06-19",
          }),
          "utf8"
        );

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/validate");
          assert.equal(status, 200);
          assert.ok(Array.isArray(body.findings), "the response is a list of findings");
          assert.ok(body.findings.length >= 1, "at least one finding");
          const slugFinding = body.findings.find((f) => /slug/.test(f.problem));
          assert.ok(slugFinding, "one finding names the slug problem");
          assert.ok(slugFinding.path.includes("STORY.md"), "the finding names the offending document path");
          assert.ok(!slugFinding.path.includes("\\"), "the path is forward-slashed");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/03 a clean stream returns no findings",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/validate");
          assert.equal(status, 200);
          assert.deepEqual(body.findings, [], "the response is an empty list of findings");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/03 validate scoped to a selection reports only in-scope findings",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        // milestone 03 with a malformed story; milestone 04 with a malformed story
        await milestone(workDir, { number: "03", slug: "m-three", status: "in-progress", title: "Three" });
        await milestone(workDir, { number: "04", slug: "m-four", status: "in-progress", title: "Four" });
        const badThree = path.join(workDir, "03_milestone_m-three", "stories", "01_story_bad-three");
        const badFour = path.join(workDir, "04_milestone_m-four", "stories", "01_story_bad-four");
        for (const [dir, slug, parent] of [[badThree, "wrong-three", "3"], [badFour, "wrong-four", "4"]]) {
          await mkdir(path.join(dir, "tasks"), { recursive: true });
          await writeFile(
            path.join(dir, "STORY.md"),
            frontmatter({ type: "story", number: "01", slug, status: "in-progress", title: '"Bad"', parent, created: "2026-06-19", updated: "2026-06-19" }),
            "utf8"
          );
        }

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/validate?scope=03");
          assert.equal(status, 200);
          assert.ok(body.findings.length >= 1, "in-scope findings reported");
          assert.ok(body.findings.every((f) => f.path.includes("m-three")), "only findings under milestone 03 are reported");
          assert.ok(!body.findings.some((f) => f.path.includes("m-four")), "findings under milestone 04 are not reported");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/03 validate changes no files",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });

        const before = await snapshotDir(workDir);
        await withServer(repo, async (url) => {
          const { status } = await getJson(url, "/api/work/validate");
          assert.equal(status, 200);
        });
        const after = await snapshotDir(workDir);
        assert.deepEqual(diffSnapshots(before, after), [], "no file in the work stream is changed");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ===================== 04_next-item.feature ===============================
  {
    name: "board-api/04 next returns 'ready' carrying the next item's ref",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/next");
          assert.equal(status, 200);
          assert.equal(body.state, "ready");
          assert.ok(typeof body.ref === "string" && body.ref.length > 0, "the next item's ref is carried");
          if (typeof body.path === "string") assert.ok(!body.path.includes("\\"), "path is forward-slashed");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/04 next returns 'blocked' carrying a waitingOn list",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        // 03 not done, 04 depends on 03 → 04 is blocked, but 03 is ready first;
        // to isolate a pure-blocked stream, make 03 done with no stories and 04
        // depend on a NOT-done driver 05.
        await milestone(workDir, { number: "03", slug: "m-three", status: "done", title: "Three" });
        await milestone(workDir, { number: "05", slug: "m-five", status: "in-progress", title: "Five" });
        await milestone(workDir, { number: "04", slug: "m-four", status: "in-progress", title: "Four", depends: "5" });

        // scope to just 04 so only the blocked driver is in range
        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/next?scope=04");
          assert.equal(status, 200);
          assert.equal(body.state, "blocked");
          assert.ok(Array.isArray(body.waitingOn), "a waitingOn list of what it needs is carried");
          assert.ok(body.waitingOn.includes("5"), "waitingOn names the unmet driver");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/04 next returns 'done' with no ref when every driver is done",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "m-three", status: "done", title: "Three" });
        await milestone(workDir, { number: "04", slug: "m-four", status: "done", title: "Four" });

        await withServer(repo, async (url) => {
          const { status, body } = await getJson(url, "/api/work/next");
          assert.equal(status, 200);
          assert.equal(body.state, "done");
          assert.equal(body.ref, undefined, "done carries no ref");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/04 a blocked result names the unmet dependencies it waits on",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        // milestone 04 depends on milestone 03, and 03 is not done
        await milestone(workDir, { number: "03", slug: "m-three", status: "in-progress", title: "Three" });
        await milestone(workDir, { number: "04", slug: "m-four", status: "in-progress", title: "Four", depends: "3" });

        await withServer(repo, async (url) => {
          // scope to 04 so 03's own readiness doesn't preempt the blocked answer
          const { status, body } = await getJson(url, "/api/work/next?scope=04");
          assert.equal(status, 200);
          assert.equal(body.state, "blocked");
          assert.ok(body.waitingOn.includes("3"), "the waitingOn list contains 03's driver number");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "board-api/04 next changes no files",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "The work board UI" });
        await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });

        const before = await snapshotDir(workDir);
        await withServer(repo, async (url) => {
          const { status } = await getJson(url, "/api/work/next");
          assert.equal(status, 200);
        });
        const after = await snapshotDir(workDir);
        assert.deepEqual(diffSnapshots(before, after), [], "no file in the work stream is changed");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ============================================================================
  // milestone 127 / story 04 / task 02 —
  //   tasks/02_the-list-route-takes-include-archived.feature (@executable)
  //
  // `/api/work/list` takes `includeArchived`, default excluded, and threads it to `work:list`'s
  // own `all` flag — the face filters nothing and enumerates nothing. Driven over the REAL board
  // face (`withBoardFace`) against a three-root stream on disk.
  // ============================================================================
  {
    name: "board-api/127-04-02 the default list excludes archived rows and carries the backlog; `?includeArchived=1` appends the archive after the live and backlog rows — the envelope keeps its three keys in both states",
    async run() {
      await withBoardFace(async (face) => {
        const { status, body: envelope } = await getJson(face.url, "/api/work/list");
        assert.equal(status, 200);
        assert.deepEqual(Object.keys(envelope).sort(), ["items", "nodeId", "stalenessSeconds"], "the envelope's keys are exactly items, stalenessSeconds, nodeId");
        assert.deepEqual(
          envelope.items.map((row) => row.ref),
          ["43", "43/03", "43/04", "43/05", "43/06", "44", "search-the-fleet", "prune-logs"],
          "the live rows, then the backlog in group-then-slug order — and NO archived row",
        );
        const backlogMilestone = envelope.items.find((row) => row.ref === "search-the-fleet");
        const { dir, answeredFrom, ...rest } = backlogMilestone;
        // The fixture scaffolds a backlog record doc from the template's own `status:
        // not-started` line (the feature spelled `status: null`; the shape claim is unchanged).
        assert.deepEqual(rest, { ref: "search-the-fleet", type: "milestone", slug: "search-the-fleet", status: "not-started", title: "Search the fleet", parent: null, number: null, backlog: "" });
        assert.match(dir, /\/backlog\/milestone_search-the-fleet$/, "its dir is under backlog/");
        assert.equal(answeredFrom, "disk", "…plus the answering-side stamp");
        assert.equal(envelope.items.find((row) => row.ref === "prune-logs").backlog, "ops/later");
        for (const row of envelope.items.filter((candidate) => !["search-the-fleet", "prune-logs"].includes(candidate.ref))) {
          assertFrozenShape(row, ["ref", "type", "slug", "status", "title", "parent", "dir"], `live row ${row.ref}`);
        }

        const included = await getJson(face.url, "/api/work/list?includeArchived=1");
        assert.equal(included.status, 200);
        assert.deepEqual(Object.keys(included.body).sort(), ["items", "nodeId", "stalenessSeconds"], "the envelope's keys are still exactly the three");
        assert.deepEqual(
          included.body.items.map((row) => row.ref),
          ["43", "43/03", "43/04", "43/05", "43/06", "44", "search-the-fleet", "prune-logs", "12", "12/00", "13"],
          "the same eight rows followed by the archive",
        );
        for (const ref of ["12", "12/00", "13"]) {
          const row = included.body.items.find((candidate) => candidate.ref === ref);
          assert.equal(row.archived, true, `${ref}: archived: true`);
          assert.equal(row.status, "done", `${ref}: status done`);
        }
        assert.equal(included.body.items.find((row) => row.ref === "12/00").parent, "12");
      }, { stream: THREE_ROOT_STREAM });
    },
  },
  ...[
    ["", false],
    ["?includeArchived=1", true],
    ["?includeArchived=true", true],
    ["?includeArchived=0", false],
    ["?includeArchived=", false],
    ["?includeArchived=yes", false],
    ["?all=1", false],
  ].map(([query, included]) => ({
    name: `board-api/127-04-02 the parameter is a boolean flag read once — GET /api/work/list${query} ${included ? "holds 12, 12/00 and 13" : "holds no archived row"}`,
    async run() {
      await withBoardFace(async (face) => {
        const { status, body } = await getJson(face.url, `/api/work/list${query}`);
        assert.equal(status, 200);
        const archived = body.items.filter((row) => row.archived === true).map((row) => row.ref);
        assert.deepEqual(archived, included ? ["12", "12/00", "13"] : [], `${query || "(no query)"}: ${included ? "the archive is included" : "any other value is the absent state"}`);
      }, { stream: THREE_ROOT_STREAM });
    },
  })),
  {
    name: "board-api/127-04-02 the face threads the flag and adds no predicate of its own — the module invokes work:list with mesh + all, reads no row's flag, filters nothing, imports no enumerator, spells `intake` nowhere; and `aof work list --json` is untouched by the route's parameter",
    async run() {
      const stripped = (await readFile(path.join(repoRoot, "src", "board-ui.mjs"), "utf8"))
        .replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      assert.match(stripped, /invoke\("work:list", \{ mesh: true, \.\.\.\(all \? \{ all: true \} : \{\}\) \}, ctx\)/, "the list route invokes work:list with mesh: true and, under the parameter, all: true");
      assert.doesNotMatch(stripped, /\.archived\b/, "the module reads no row's `archived`");
      assert.doesNotMatch(stripped, /\.filter\(/, "…and filters no rows");
      assert.doesNotMatch(stripped, /\blistItems\b|\blistStream\b/, "…and imports no enumerator");
      const imports = [...stripped.matchAll(/^import .* from "([^"]+)";$/gm)].map((match) => match[1]).filter((spec) => spec.startsWith("."));
      // 131/04 — `./static-serve.mjs` is the pure leaf holding the write admission's loopback predicate.
      assert.deepEqual(imports.filter((spec) => spec !== "./cache-provenance.mjs" && spec !== "./static-serve.mjs"), ["./command-core.mjs"], "its only operation-bearing import is ./command-core.mjs (the window resolver and the loopback predicate are pure)");
      assert.equal((stripped.match(/intake/g) ?? []).length, 0, "the face contains the token `intake` zero times (FF-12704)");

      const listSource = await readFile(path.join(repoRoot, "src", "commands", "list.mjs"), "utf8");
      assert.ok(!listSource.includes("includeArchived"), "no `includeArchived` is spelled anywhere in src/commands/list.mjs");

      await withBoardFace(async (face) => {
        const result = spawnCliSync(process.execPath, [cliPath, "work", "list", "--json"], {
          cwd: face.root,
          encoding: "utf8",
          env: { ...process.env, AOF_GLOBAL_HOME: face.home, NODE_NO_WARNINGS: "1" },
        });
        assert.equal(result.status, 0, `work list --json exits 0 (stderr: ${result.stderr})`);
        const rows = JSON.parse(result.stdout);
        assert.deepEqual(rows.map((row) => row.ref), ["43", "43/03", "43/04", "43/05", "43/06", "44", "search-the-fleet", "prune-logs"], "the frozen array: the default listing, no archive, no route parameter");
        for (const row of rows.filter((candidate) => candidate.number !== null)) {
          assert.deepEqual(Object.keys(row), ["ref", "type", "slug", "status", "title", "parent", "dir"], `${row.ref}: the frozen seven keys, nothing else`);
        }
      }, { stream: THREE_ROOT_STREAM });
    },
  },
  {
    name: "board-api/127-04-02 the UI client composes the URL from a boolean — OFF is /api/work/list with no query string, ON is ?includeArchived=1 — and WorkItem declares the three optional keys; the build's own type pass is clean",
    async run() {
      // The client, driven through the REAL <Board/> against the REAL face: the mount's first
      // request is `workApi.list({ includeArchived: false })` (the toggle's committed default),
      // the toggle's click is `workApi.list({ includeArchived: true })`, and the sync after it
      // is the committed state again. The recorded URLs are the app's own traffic.
      await withBoardFace(async (face) => {
        await withBoardApp({ url: face.url }, async (app) => {
          const urls = () => app.requestsMatching("/api/work/list").map((entry) => new URL(entry.url).pathname + new URL(entry.url).search);
          assert.deepEqual(urls(), ["/api/work/list"], "the off state carries no query string at all");
          const toggle = findAll(app.tree(), (node) => node.type === "button" && node.props?.["aria-label"] === "Show archived items")[0];
          assert.ok(toggle, "the Show archived toggle is on the page");
          await toggle.props.onClick();
          await app.flush();
          assert.deepEqual(urls(), ["/api/work/list", "/api/work/list?includeArchived=1"], "ON composes ?includeArchived=1");
          await toggle.props.onClick();
          await app.flush();
          assert.deepEqual(urls().at(-1), "/api/work/list", "…and OFF again is the bare route");
        });
      }, { stream: THREE_ROOT_STREAM });

      const apiSource = await readFile(path.join(repoRoot, "ui", "src", "board", "api.ts"), "utf8");
      const workItem = apiSource.slice(apiSource.indexOf("export type WorkItem = {"), apiSource.indexOf("export type WorkStatus"));
      for (const key of ["number?: null;", "backlog?: string;", "archived?: true;"]) {
        assert.ok(workItem.includes(key), `WorkItem declares ${key}`);
      }
      for (const key of ["ref: string;", "slug: string;", "status: WorkStatus | null;", "title: string | null;", "parent: string | null;", "dir: string;", "reportedBy?: string | null;", "syncedAt?: string | null;"]) {
        assert.ok(workItem.includes(key), `…beside the frozen key ${key}`);
      }
      assert.match(apiSource, /includeArchived \? "\/api\/work\/list\?includeArchived=1" : "\/api\/work\/list"/, "the client composes the URL from the boolean");

      // `tsc -b` in ui/ — the build's own type pass (scripts/ui-build.mjs runs exactly this).
      const tsc = spawnSync(process.execPath, [path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"), "-b"], {
        cwd: path.join(repoRoot, "ui"),
        encoding: "utf8",
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      });
      assert.equal(tsc.status, 0, `tsc -b in ui/ is clean:\n${tsc.stdout}${tsc.stderr}`);
    },
  },
  // milestone 133 / story 04 / task 00 — a diagram's SVG rides the manifest, `work:doc` answers a
  // member (or an absent doc), and `/api/work/doc` forwards `member` only when there is one.
  {
    name: "133/04 task 00: the doc command answers a diagram member, reports a missing one absent, and refuses out of contract",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      const previous = process.env.AOF_GLOBAL_HOME;
      process.env.AOF_GLOBAL_HOME = await mkdtemp(path.join(os.tmpdir(), "aof-board-diagrams-home-"));
      try {
        const dir = await milestone(workDir, { number: "07", slug: "m", status: "in-progress", title: "M" });
        await mkdir(path.join(dir, "diagrams"), { recursive: true });
        for (const ext of [".html", ".svg", ".png"]) await writeFile(path.join(dir, "diagrams", `ADR-002-seam${ext}`), `body${ext}`, "utf8");
        const cli = spawnCliSync(process.execPath, [cliPath, "work", "doc", "07", "DIAGRAMS", "ADR-002-seam.svg", "--json"], { cwd: repo, encoding: "utf8", env: { ...process.env } });
        assert.equal(cli.status, 0, cli.stderr);
        assert.equal(JSON.parse(cli.stdout).body, await readFile(path.join(dir, "diagrams", "ADR-002-seam.svg"), "utf8"));
        await withServer(repo, async (url) => {
          const absent = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS&member=ADR-009-none.svg");
          assert.equal(absent.status, 200);
          assert.equal(absent.body.present, false, "an absent diagram is an absent doc, not a thrown error");
          const html = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS&member=ADR-002-seam.html");
          const outsideTasks = await getJson(url, "/api/work/doc?ref=07&doc=TASKS&member=notes.md");
          assert.equal(html.status, outsideTasks.status);
          assert.equal(html.body.code, outsideTasks.body.code, "the refusal a TASKS member outside its extension gets");
          const none = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS");
          const noTasks = await getJson(url, "/api/work/doc?ref=07&doc=TASKS");
          assert.equal(none.body.code, noTasks.body.code, "the refusal a TASKS request with no member gets");
          assert.equal(none.body.code, "invalid-doc-member");
        });
      } finally {
        await rm(process.env.AOF_GLOBAL_HOME, { recursive: true, force: true });
        if (previous === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = previous;
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "133/04 task 00: the board route forwards the member, and only when there is one",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const dir = await milestone(workDir, { number: "07", slug: "m", status: "in-progress", title: "M" });
        await mkdir(path.join(dir, "diagrams"), { recursive: true });
        await writeFile(path.join(dir, "diagrams", "ADR-002-seam.svg"), "<svg viewBox=\"0 0 1 1\"/>", "utf8");
        await withServer(repo, async (url) => {
          const member = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS&member=ADR-002-seam.svg");
          assert.equal(member.status, 200);
          assert.equal(member.body.body, "<svg viewBox=\"0 0 1 1\"/>");
          const blank = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS&member=%20");
          const none = await getJson(url, "/api/work/doc?ref=07&doc=DIAGRAMS");
          assert.deepEqual([blank.status, blank.body], [none.status, none.body], "a blank member is no member");
          const spec = await fetch(new URL("/api/work/doc?ref=07&doc=SPEC", url)).then((response) => response.text());
          const specWithBlank = await fetch(new URL("/api/work/doc?ref=07&doc=SPEC&member=", url)).then((response) => response.text());
          assert.equal(specWithBlank, spec, "a request without a member is byte-identical");
          assert.equal(JSON.parse(spec).present, true);
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "133/04 task 03 (@finding-F-133-02): diagram:file answers the bytes, an absence, or a coded refusal",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const dir = await milestone(workDir, { number: "07", slug: "m", status: "in-progress", title: "M" });
        await mkdir(path.join(dir, "diagrams"), { recursive: true });
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
        await writeFile(path.join(dir, "diagrams", "ADR-002-seam.png"), png);
        const ask = (file) => spawnCliSync(process.execPath, [cliPath, "diagram", "file", "07", file, "--json"], { cwd: repo, encoding: "utf8", env: { ...process.env } });
        const present = ask("ADR-002-seam.png");
        assert.equal(present.status, 0, present.stderr);
        const envelope = JSON.parse(present.stdout);
        assert.deepEqual([envelope.present, envelope.onThisNode, envelope.contentType, envelope.file], [true, true, "image/png", "ADR-002-seam.png"]);
        assert.equal("body" in envelope, false, "the terminal face drops the bytes");
        assert.equal(path.resolve(envelope.path), path.resolve(dir, "diagrams", "ADR-002-seam.png"));
        const absent = ask("ADR-002-seam.html");
        assert.equal(absent.status, 1);
        assert.deepEqual([JSON.parse(absent.stdout).present, JSON.parse(absent.stdout).onThisNode], [false, true]);
        const refused = ask("../SPEC.md");
        assert.notEqual(refused.status, 0);
        assert.match(refused.stdout + refused.stderr, /diagram-file-invalid/);
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "133/04 task 03 (@finding-F-133-02): the board route serves the bytes sandboxed, and says plainly when there is nothing",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      try {
        const dir = await milestone(workDir, { number: "07", slug: "m", status: "in-progress", title: "M" });
        await mkdir(path.join(dir, "diagrams"), { recursive: true });
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
        await writeFile(path.join(dir, "diagrams", "ADR-002-seam.png"), png);
        await writeFile(path.join(dir, "diagrams", "ADR-002-seam.html"), "<!doctype html><script>parent.x=1</script>", "utf8");
        await withServer(repo, async (url) => {
          const served = await fetch(new URL("/api/diagram/file?ref=07&file=ADR-002-seam.png", url));
          assert.equal(served.status, 200);
          assert.equal(served.headers.get("content-type"), "image/png");
          assert.equal(served.headers.get("content-security-policy"), "sandbox");
          assert.deepEqual(Buffer.from(await served.arrayBuffer()), png, "the file's exact bytes");
          const html = await fetch(new URL("/api/diagram/file?ref=07&file=ADR-002-seam.html", url));
          assert.equal(html.headers.get("content-type"), "text/html; charset=utf-8");
          assert.equal(html.headers.get("content-security-policy"), "sandbox", "the generator's HTML runs no script in this origin");
          await html.arrayBuffer();
          const missing = await fetch(new URL("/api/diagram/file?ref=07&file=ADR-009-none.svg", url));
          assert.equal(missing.status, 404);
          assert.match(await missing.text(), /ADR-009-none\.svg is not in this item/);
          const outside = await getJson(url, "/api/diagram/file?ref=07&file=..%2FSPEC.md");
          assert.equal(outside.status, 400);
          assert.equal(outside.body.code, "diagram-file-invalid");
        });
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // 131/04 — hoisted below.
  ...boardAnswerTests(),
];

// ---- 131/04 tasks 01 and 02 — the board answers through work:answer, behind one admission --------
//
// Every request here goes through `node:http`, because Node's `fetch` silently drops a caller-set
// `Host` and the rebinding rows are exactly a Host the page chose. The board's ctx carries no aof
// home of its own, so the ask is opened in the home the runner isolated (`process.env`), under a
// run id unique to the case, and removed after it.

let boardAskSeq = 0;

function boardRequest(url, { method = "POST", route, host, origin, contentType, body } = {}) {
  const target = new URL(url);
  const headers = {};
  if (host !== undefined) headers.host = host;
  if (origin !== undefined) headers.origin = origin;
  if (contentType !== undefined) headers["content-type"] = contentType;
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: target.hostname, port: target.port, method, path: route, headers }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = text === "" ? null : JSON.parse(text); } catch { parsed = text; }
        resolve({ status: response.statusCode, headers: response.headers, body: parsed });
      });
    });
    request.on("error", reject);
    if (body != null) request.write(body);
    request.end();
  });
}

// B: milestone 03 and story 03/01 with a STATE.md, and a waiting ask for the case's run.
async function withAnswerBoard(body, { open = true } = {}) {
  const { repo, workDir } = await makeRepo();
  await milestone(workDir, { number: "03", slug: "work-board", status: "in-progress", title: "Work board" });
  const storyDir = await story(workDir, "03_milestone_work-board", { number: "01", slug: "work-board", status: "in-progress", title: "The work board", parent: "3" });
  await writeFile(path.join(storyDir, "STATE.md"), "# 01 · State\n\n## Feedback (for retro)\n\n", "utf8");
  const workspace = await loadWorkspace(repo);
  const workspaceId = resolveWorkspaceId(workspace);
  const dir = loopAsksDir(process.env);
  boardAskSeq += 1;
  const runId = `r1-board-${process.pid}-${boardAskSeq}`;
  if (open) await openAsk(dir, { runId, workspaceId, ref: "03/01", sessionId: "S1", phase: "build", scope: "03" });
  try {
    return await withServer(repo, (url) => body({ url, repo, workDir, storyDir, dir, runId, workspaceId, same: new URL(url).origin, port: new URL(url).port }));
  } finally {
    await clearAsk(dir, runId).catch(() => {});
    await rm(repo, { recursive: true, force: true });
  }
}

async function treeSnapshot(root) {
  const snap = {};
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else snap[path.relative(root, full)] = await readFile(full, "utf8");
    }
  }
  await walk(root);
  return snap;
}

const askBytes = (dir, runId) => readFile(askRequestPath(dir, runId), "utf8").catch(() => null);
const answerBody = (fields) => JSON.stringify(fields);

function boardAnswerTests() {
  const DOC_KEYS = ["ok", "ref", "runId", "delivery", "state", "by", "answeredAt", "resume"];
  return [
    {
      name: "131/04 task01 — the board answers the waiting ask through the verb, as the board",
      run: () => withAnswerBoard(async ({ url, same, dir, runId }) => {
        const response = await boardRequest(url, { route: "/api/work/answer", origin: same, contentType: "application/json", body: answerBody({ ref: "03/01", text: "take b", actor: "umami" }) });
        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.body), DOC_KEYS, "the eight keys in order");
        assert.equal(response.body.ok, true);
        assert.equal(response.body.ref, "03/01");
        assert.equal(response.body.runId, runId);
        assert.equal(response.body.delivery, "waiting");
        assert.equal(response.body.state, "answered");
        assert.deepEqual(response.body.by, { actor: "umami", via: "board", node: null });
        assert.match(response.body.answeredAt, /Z$/u);
        assert.equal(response.body.resume, null);
        const record = await readAsk(dir, runId);
        assert.equal(record.state, "answered");
        assert.equal(record.answer, "take b");
        assert.equal(record.by.via, "board");
      }),
    },
    {
      name: "131/04 task01 — a refusal from the verb passes through in the frozen envelope (twelve rows)",
      run: async () => {
        const rows = [
          [null, { ref: "03/01", text: "" }, 400, "answer-empty"],
          [null, { ref: "03/01", text: "ok\u001b[201~" }, 400, "answer-control-chars"],
          ["answered", { ref: "03/01", text: "c" }, 409, "ask-already-answered"],
          ["none", { ref: "03/01", text: "take b" }, 409, "answer-not-waiting"],
          [null, { ref: "999/99", text: "take b" }, 404, "ref-not-found"],
          [null, { ref: "999/99", text: "" }, 404, "ref-not-found"],
          [null, { text: "take b" }, 404, "ref-not-found"],
          [null, { ref: 3, text: "take b" }, 404, "ref-not-found"],
          [null, { ref: "03/01" }, 400, "answer-empty"],
          [null, { ref: "03/01", text: 42 }, 400, "answer-empty"],
          [null, { ref: "03/01", text: "a".repeat(8001) }, 400, "answer-too-long"],
          [null, { ref: "03/01", text: "b", actor: "a".repeat(81) }, 400, "answer-actor-invalid"],
        ];
        for (const [index, [given, body, status, code]] of rows.entries()) {
          await withAnswerBoard(async ({ url, same, dir, runId, workspaceId }) => {
            if (given === "answered") await answerAsk(dir, { workspaceId, ref: "03/01", text: "a", by: { actor: "you", via: "cli", node: null } });
            const before = await askBytes(dir, runId);
            const response = await boardRequest(url, { route: "/api/work/answer", origin: same, contentType: "application/json", body: answerBody(body) });
            assert.equal(response.status, status, `row ${index}: status`);
            assert.deepEqual(Object.keys(response.body), ["ok", "error", "code"], `row ${index}: the frozen envelope`);
            assert.equal(response.body.ok, false);
            assert.equal(typeof response.body.error, "string");
            assert.equal(response.body.code, code, `row ${index}: code`);
            assert.equal(await askBytes(dir, runId), before, `row ${index}: the ask file is byte-unchanged`);
          }, { open: given !== "none" });
        }
      },
    },
    {
      name: "131/04 task01 — admission refuses before the body is read, and the body reader after it, on every board write route alike (forty-two rows)",
      run: async () => {
        const JSON_CT = "application/json";
        const WELL = answerBody({ ref: "03/01", text: "b" });
        const BIG = "a".repeat(2_000_000);
        const OVERSIZE = JSON.stringify({ ref: "03/01", text: "b", pad: "a".repeat(1_000_001) });
        // [method, route, origin, contentType, rawBody, status, code] — origin: "SAME", "SAME/", "HTTPS", "LOCALHOST" or a literal.
        const rows = [
          ["GET", "answer", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["PUT", "answer", "SAME", JSON_CT, WELL, 405, "method-not-allowed"],
          ["DELETE", "answer", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["OPTIONS", "answer", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["POST", "answer", "http://evil.example", JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", "SAME/", JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", undefined, JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", "null", JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", "HTTPS", JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", "LOCALHOST", JSON_CT, WELL, 403, "cross-origin-refused"],
          ["POST", "answer", "http://evil.example", JSON_CT, BIG, 403, "cross-origin-refused"],
          ["POST", "answer", "SAME", "text/plain", WELL, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", undefined, WELL, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", "application/jsonp", WELL, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", "text/json", WELL, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", "application/x-www-form-urlencoded", "ref=03/01&text=b", 400, "invalid-content-type"],
          ["POST", "answer", "SAME", "multipart/form-data", WELL, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", "text/plain", BIG, 400, "invalid-content-type"],
          ["POST", "answer", "SAME", JSON_CT, "{ not json", 400, "malformed-json"],
          ["POST", "answer", "SAME", JSON_CT, "", 400, "empty-json"],
          ["POST", "answer", "SAME", JSON_CT, OVERSIZE, 413, "payload-too-large"],
          ["POST", "answer", "SAME", JSON_CT, "null", 400, "invalid-body"],
          ["POST", "answer", "SAME", JSON_CT, '["03/01", "b"]', 400, "invalid-body"],
          ["POST", "answer", "SAME", JSON_CT, '"take b"', 400, "invalid-body"],
          ["POST", "answer", "SAME", JSON_CT, "42", 400, "invalid-body"],
          ["POST", "answer/", "SAME", JSON_CT, WELL, 404, "not-found"],
          ["GET", "feedback", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["POST", "feedback", "http://evil.example", JSON_CT, answerBody({ ref: "03/01", note: "x" }), 403, "cross-origin-refused"],
          ["POST", "feedback", undefined, JSON_CT, answerBody({ ref: "03/01", note: "x" }), 403, "cross-origin-refused"],
          ["POST", "feedback", "SAME", "text/plain", answerBody({ ref: "03/01", note: "x" }), 400, "invalid-content-type"],
          ["POST", "resync", undefined, JSON_CT, answerBody({ ref: "03/01" }), 403, "cross-origin-refused"],
          ["POST", "resync", "SAME", "text/plain", answerBody({ ref: "03/01" }), 400, "invalid-content-type"],
          ["GET", "resync", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["GET", "continue", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["POST", "continue", undefined, JSON_CT, answerBody({ ref: "03/01" }), 403, "cross-origin-refused"],
          ["POST", "refine", "SAME", "text/plain", answerBody({ ref: "03/01" }), 400, "invalid-content-type"],
          ["GET", "verify", "SAME", JSON_CT, null, 405, "method-not-allowed"],
          ["POST", "verify", "http://evil.example", JSON_CT, answerBody({ ref: "03/01" }), 403, "cross-origin-refused"],
          ["POST", "feedback", "SAME", JSON_CT, "null", 400, "invalid-body"],
          ["POST", "resync", "SAME", JSON_CT, '["03/01"]', 400, "invalid-body"],
          ["POST", "continue", "SAME", JSON_CT, '"03/01"', 400, "invalid-body"],
          ["POST", "refine", "SAME", JSON_CT, "true", 400, "invalid-body"],
        ];
        assert.equal(rows.length, 42, "every row of the outline is walked");
        await withAnswerBoard(async ({ url, same, port, repo, dir, runId }) => {
          const origins = { SAME: same, "SAME/": `${same}/`, HTTPS: `https://127.0.0.1:${port}`, LOCALHOST: `http://localhost:${port}` };
          const before = await treeSnapshot(repo);
          const ask = await askBytes(dir, runId);
          for (const [index, [method, route, origin, contentType, body, status, code]] of rows.entries()) {
            const response = await boardRequest(url, { method, route: `/api/work/${route}`, origin: origins[origin] ?? origin, contentType, body });
            assert.equal(response.status, status, `row ${index} (${method} ${route}): status`);
            assert.equal(response.body?.code, code, `row ${index} (${method} ${route}): code`);
            assert.notEqual(response.body?.ok, true, `row ${index}: never ok`);
            if (status === 405) assert.equal(response.headers.allow, "POST", `row ${index}: Allow: POST`);
          }
          assert.deepEqual(await treeSnapshot(repo), before, "no record doc, FEEDBACK.ndjson or STATE.md under B changed");
          assert.equal(await askBytes(dir, runId), ask, "the ask file is unchanged");
        });
      },
    },
    {
      name: "131/04 task01 — a JSON content-type with parameters or another case is admitted, as the fleet admits it (three rows)",
      run: () => withAnswerBoard(async ({ url, same }) => {
        for (const contentType of ["application/json; charset=utf-8", "application/json;charset=UTF-8", "APPLICATION/JSON"]) {
          const response = await boardRequest(url, { route: "/api/work/answer", origin: same, contentType, body: answerBody({ ref: "03/01", text: "" }) });
          assert.equal(response.status, 400, contentType);
          assert.equal(response.body.code, "answer-empty", `${contentType}: the verb's own refusal, so admission passed`);
        }
      }),
    },
    {
      name: "131/04 task01 — the body's actor passes through, and the verb decides the default (six rows)",
      run: async () => {
        const rows = [[undefined, "you"], ["", "you"], ["   ", "you"], [null, "you"], [42, "you"], [" qa ", "qa"]];
        for (const [actor, by] of rows) {
          await withAnswerBoard(async ({ url, same }) => {
            const body = actor === undefined ? { ref: "03/01", text: "take b" } : { ref: "03/01", text: "take b", actor };
            const response = await boardRequest(url, { route: "/api/work/answer", origin: same, contentType: "application/json", body: answerBody(body) });
            assert.equal(response.status, 200, JSON.stringify(actor));
            assert.equal(response.body.by.actor, by, JSON.stringify(actor));
            assert.equal(response.body.by.via, "board");
          });
        }
      },
    },
    {
      name: "131/04 task01 — a second answer from the board is refused naming the first, and the first stands",
      run: () => withAnswerBoard(async ({ url, same, dir, runId }) => {
        const post = (text) => boardRequest(url, { route: "/api/work/answer", origin: same, contentType: "application/json", body: answerBody({ ref: "03/01", text, actor: "umami" }) });
        assert.equal((await post("take b")).status, 200);
        const again = await post("take c");
        assert.equal(again.status, 409);
        assert.equal(again.body.code, "ask-already-answered");
        assert.match(again.body.error, /umami/u);
        assert.equal((await readAsk(dir, runId)).answer, "take b");
      }),
    },
    {
      name: "131/04 task01/02 — a read route takes no admission, and ignores the Host (five rows)",
      run: () => withAnswerBoard(async ({ url }) => {
        const rows = [["list", undefined, undefined], ["list", "http://evil.example", undefined], ["next", undefined, undefined], ["doctor", "http://evil.example", undefined], ["list", "http://evil.example:1234", "evil.example:1234"]];
        for (const [route, origin, host] of rows) {
          const response = await boardRequest(url, { method: "GET", route: `/api/work/${route}`, origin, host });
          assert.equal(response.status, 200, `${route} ${origin ?? "(no origin)"} ${host ?? ""}`);
          assert.notEqual(response.body?.ok, false);
        }
      }),
    },
    {
      name: "131/04 task01 — a same-origin feedback POST still lands, so the board's own client is unaffected",
      run: () => withAnswerBoard(async ({ url, same, storyDir }) => {
        const response = await boardRequest(url, { route: "/api/work/feedback", origin: same, contentType: "application/json", body: answerBody({ ref: "03/01", note: "still works", actor: "qa" }) });
        assert.equal(response.status, 200);
        const state = await readFile(path.join(storyDir, "STATE.md"), "utf8");
        assert.equal((state.match(/^- still works/gmu) ?? []).length, 1, "exactly one bullet");
      }),
    },
    {
      name: "131/04 task01 — only ref, text and actor are lifted off the body",
      run: () => withAnswerBoard(async ({ url, same }) => {
        const response = await boardRequest(url, {
          route: "/api/work/answer", origin: same, contentType: "application/json",
          body: answerBody({ ref: "03/01", text: "take b", actor: "umami", via: "cli", by: { actor: "root" }, now: "1999-01-01T00:00:00.000Z", state: "waiting" }),
        });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.by, { actor: "umami", via: "board", node: null });
        assert.notEqual(response.body.answeredAt, "1999-01-01T00:00:00.000Z");
        const source = (await readFile(path.join(repoRoot, "src", "board-ui.mjs"), "utf8")).replace(/^\s*\/\/[^\n]*$/gmu, "");
        const branch = matchedBraceBody(source, source.indexOf('pathname === "/api/work/answer"')) ?? "";
        assert.deepEqual([...new Set(branch.match(/\bbody\.[a-zA-Z]+/gu))].sort(), ["body.actor", "body.ref", "body.text"]);
      }),
    },
    {
      name: "131/04 task01 — every board write passes one admission, in the source",
      run: async () => {
        // Whole-line comments only: a trailing-`//` strip would cut `http://${…}` in half.
        const source = (await readFile(path.join(repoRoot, "src", "board-ui.mjs"), "utf8")).replace(/^\s*\/\/[^\n]*$/gmu, "");
        assert.equal((source.match(/function admitWriteRequest\(/gu) ?? []).length, 1, "defined exactly once");
        assert.ok(source.includes('pathname === "/api/work/answer"'));
        assert.equal((source.match(/(?<!function )\badmitWriteRequest\(/gu) ?? []).length, 4, "four call sites");
        const helper = matchedBraceBody(source, source.indexOf("function admitWriteRequest(")) ?? "";
        const order = ['request.method !== "POST"', "originHeader !==", "isLoopbackHost(", "application\\/json"].map((marker) => helper.indexOf(marker));
        assert.ok(order.every((at) => at >= 0), `every check is present: ${order}`);
        assert.deepEqual([...order].sort((a, b) => a - b), order, "method, then Origin, then isLoopbackHost(, then content-type");
        for (const verb of ["writeFile", "appendFile", "spawn", "exec"]) assert.ok(!new RegExp(`\\b${verb}\\s*\\(`, "u").test(source), `no ${verb}(`);
      },
    },
    {
      name: "131/04 task02 — a rebinding page is refused on the board's write routes, before the body is read (nine rows)",
      run: () => withAnswerBoard(async ({ url, port, repo, dir, runId }) => {
        const WELL = { answer: answerBody({ ref: "03/01", text: "b" }), feedback: answerBody({ ref: "03/01", note: "x" }) };
        const rows = [
          ["answer", "evil.example:1234", WELL.answer, 403, "non-loopback-host"],
          ["feedback", "evil.example:1234", WELL.feedback, 403, "non-loopback-host"],
          ["continue", "evil.example:1234", answerBody({ ref: "03/01" }), 403, "non-loopback-host"],
          ["refine", "evil.example:1234", answerBody({ ref: "03/01" }), 403, "non-loopback-host"],
          ["verify", `10.0.0.1:${port}`, answerBody({ ref: "03/01" }), 403, "non-loopback-host"],
          ["resync", "evil.example:1234", answerBody({ ref: "03/01" }), 403, "non-loopback-host"],
          ["answer", "evil.example:1234", "a".repeat(2_000_000), 403, "non-loopback-host"],
          ["answer", `localhost:${port}`, answerBody({ ref: "03/01", text: "" }), 400, "answer-empty"],
          ["answer", `[::1]:${port}`, answerBody({ ref: "03/01", text: "" }), 400, "answer-empty"],
        ];
        const before = await treeSnapshot(repo);
        const ask = await askBytes(dir, runId);
        for (const [route, host, body, status, code] of rows) {
          const response = await boardRequest(url, { route: `/api/work/${route}`, host, origin: `http://${host}`, contentType: "application/json", body });
          assert.equal(response.status, status, `${route} ${host}`);
          assert.equal(response.body.code, code, `${route} ${host}`);
          if (code === "non-loopback-host") {
            assert.equal(response.body.error, "Write refused: the page was not served from a loopback address.");
            assert.ok(!JSON.stringify(response.body).includes(host.split(":")[0]), "the refusal names no host");
          }
        }
        assert.deepEqual(await treeSnapshot(repo), before, "no record doc changed");
        assert.equal(await askBytes(dir, runId), ask, "no ask file changed");
      }),
    },
    {
      name: "131/04 task02 — method, Origin, Host and content-type are checked in that order on the board (five rows)",
      run: () => withAnswerBoard(async ({ url, port }) => {
        const rows = [
          ["GET", "evil.example:1234", "http://evil.example:1234", "application/json", 405, "method-not-allowed"],
          ["POST", "evil.example:1234", undefined, "application/json", 403, "cross-origin-refused"],
          ["POST", "evil.example:1234", "http://other.example", "application/json", 403, "cross-origin-refused"],
          ["POST", "evil.example:1234", "http://evil.example:1234", "text/plain", 403, "non-loopback-host"],
          ["POST", `localhost:${port}`, `http://127.0.0.1:${port}`, "application/json", 403, "cross-origin-refused"],
        ];
        for (const [method, host, origin, contentType, status, code] of rows) {
          const response = await boardRequest(url, { method, route: "/api/work/answer", host, origin, contentType, body: method === "GET" ? null : answerBody({ ref: "03/01", text: "b" }) });
          assert.equal(response.status, status, `${method} ${host} ${origin}`);
          assert.equal(response.body.code, code, `${method} ${host} ${origin}`);
        }
      }),
    },
  ];
}
