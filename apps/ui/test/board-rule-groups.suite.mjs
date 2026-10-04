// milestone 135 / story 03 / task 01 — the story detail panel's task card shows each `Rule:` as a
// heading over its scenarios, in file order, and a task written without rules renders exactly as it
// did before (ADR-005 §2, DESIGN.md's binding checklist).
//
// Covers EVERY @executable scenario in
//   tasks/01_the-task-card-shows-scenarios-under-their-rule.feature
//
// The REAL <Board/> is mounted through the board app harness and opened on the story through its
// own deep link, against a fixture face in this process: a `node:http` server that answers the
// list, the story's documents and the scripted `/api/work/tasks` payload. The operator's door is the
// TASKS tab, clicked as they click it.
import assert from "node:assert/strict";
import http from "node:http";
import { withBoardApp, findAll, textOf } from "./support/board-app-harness.mjs";

const MILESTONE = { ref: "07", type: "milestone", slug: "m", status: "in-progress", title: "m", parent: null, dir: "/fixture/07_milestone_m" };
const STORY = { ref: "07/02", type: "story", slug: "s", status: "in-progress", title: "s", parent: "07", dir: "/fixture/07_milestone_m/stories/02_story_s" };

const scenario = (name, rule, { lane = "executable", outline = false } = {}) => (rule === undefined ? { name, outline, lane } : { name, outline, lane, rule });
const taskOf = (scenarios) => ({ file: "00_task.feature", feature: "loans", scenarios, counts: { executable: scenarios.length, manual: 0, uat: 0 } });

// A fixture face for the routes the board reads on the way to a story's TASKS tab.
async function withTasksFace(task, body) {
  const server = http.createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");
    const json = (status, payload) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
    };
    if (pathname === "/api/work/list") return json(200, { items: [MILESTONE, STORY] });
    if (pathname === "/api/work/tasks") return json(200, { ref: STORY.ref, tasks: [task] });
    if (pathname === "/api/work/doc") return json(200, { ref: STORY.ref, doc: "STORY", present: true, body: "# s\n" });
    if (pathname === "/api/work/run-status") return json(200, { ref: STORY.ref, runs: [] });
    return json(404, { ok: false, error: "not found", code: "not-found" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await body(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// The task card as the operator sees it: open the story, open TASKS, read the card's regions.
async function cardOf(task) {
  return withTasksFace(task, (url) => withBoardApp({ url, hash: STORY.ref }, async (app) => {
    await app.openTab("TASKS");
    const card = findAll(app.tree(), (node) => node.type === "section" && String(node.props?.className ?? "").includes("rounded-md border border-border p-3"))[0] ?? null;
    assert.ok(card, "the task card rendered");
    return card;
  }));
}

// The card's scenario regions in order: a heading's text, or a list's item names, plus the markup
// facts the checklist binds (classes on each list and item, the lane chip, the outline mark).
const isList = (node) => node.type === "ul";
const isHeading = (node) => node.type === "h4";
function regionsOf(card) {
  return findAll(card, (node) => isList(node) || isHeading(node)).map((node) => (isHeading(node)
    ? { heading: textOf(node).trim(), className: node.props.className }
    : {
      list: findAll(node, (child) => child.type === "li").map((item) => {
        const [chip, label] = findAll(item, (child) => child.type === "span");
        const labelText = textOf(label);
        return { name: labelText.replace("(outline)", "").trim(), chip: textOf(chip).trim(), outline: labelText.includes("(outline)") };
      }),
      className: node.props.className,
    }));
}

// A structural serialisation of a subtree — element, class and text, depth first — so "identical
// markup" compares the whole list, not a sample of it.
function markup(node) {
  if (node == null || typeof node !== "object") return node == null ? "" : String(node);
  const children = (node.children ?? []).map(markup).join("");
  return `<${node.type}${node.props?.className ? ` class="${node.props.className}"` : ""}>${children}</${node.type}>`;
}

// The scenario list exactly as `TaskList` rendered it before 135/03, for three plain scenarios.
const PRE_135_LIST = (names) => `<ul class="mt-2 space-y-1.5">${names.map((name) => `<li class="flex items-start gap-2 text-sm"><span class="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary/12 text-primary">executable</span><span class="leading-snug">${name}</span></li>`).join("")}</ul>`;

export const boardRuleGroupsTests = [
  {
    name: "135/03 01 E1 · two rules show as two headings in file order, each over its own scenarios",
    run: async () => {
      const card = await cardOf(taskOf([
        scenario("a", "R1 · at most five loans"),
        scenario("b", "R1 · at most five loans", { lane: "manual", outline: true }),
        scenario("c", "R2 · overdue blocks"),
      ]));
      const regions = regionsOf(card);
      assert.deepEqual(regions.map((region) => region.heading ?? region.list.map((item) => item.name)), [
        "R1 · at most five loans", ["a", "b"],
        "R2 · overdue blocks", ["c"],
      ]);
      for (const heading of regions.filter((region) => region.heading)) assert.equal(heading.className, "mt-3 text-xs font-semibold");
      for (const list of regions.filter((region) => region.list)) assert.equal(list.className, "mt-2 space-y-1.5 border-l border-border pl-3", "a rule's scenarios are indented with a left border");
      // Each scenario keeps its lane chip and its outline mark.
      assert.deepEqual(regions[1].list.map(({ chip, outline }) => ({ chip, outline })), [{ chip: "executable", outline: false }, { chip: "manual", outline: true }]);
    },
  },
  {
    name: "135/03 01 E2 · scenarios outside any rule come first, with no heading",
    run: async () => {
      const regions = regionsOf(await cardOf(taskOf([scenario("loose", null), scenario("a", "R1 · at most five loans")])));
      assert.equal(regions[0].heading, undefined, "nothing heads the loose scenarios");
      assert.deepEqual(regions[0].list.map((item) => item.name), ["loose"]);
      assert.equal(regions[0].className, "mt-2 space-y-1.5", "the loose scenarios are today's list");
      assert.equal(regions[1].heading, "R1 · at most five loans");
      assert.deepEqual(regions[2].list.map((item) => item.name), ["a"]);
    },
  },
  {
    name: "135/03 01 E3 · a task with no rule renders the same markup as before",
    run: async () => {
      const card = await cardOf(taskOf([scenario("one", null), scenario("two", null), scenario("three", null)]));
      const lists = findAll(card, isList);
      assert.equal(lists.length, 1);
      assert.equal(markup(lists[0]), PRE_135_LIST(["one", "two", "three"]));
      assert.deepEqual(findAll(card, isHeading), [], "no rule heading");
    },
  },
  {
    name: "135/03 01 a payload that carries no rule field reads as a task with no rule (outline: 2 rule fields)",
    run: async () => {
      for (const [label, entry] of [['"rule": null', scenario("one", null)], ['no "rule" key', scenario("one", undefined)]]) {
        const card = await cardOf(taskOf([entry]));
        assert.deepEqual(findAll(card, isHeading), [], `${label}: no heading`);
        const lists = findAll(card, isList);
        assert.equal(lists.length, 1, label);
        assert.equal(markup(lists[0]), PRE_135_LIST(["one"]), `${label}: the flat list`);
      }
    },
  },
];
