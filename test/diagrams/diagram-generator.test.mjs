// milestone 133 / story 01 / task 02 — the registry resolves one adapter, which locates the skill by
// path, writes the drawing instructions and turns a source into an SVG (ADR-002).
//
// Every `locate` case runs against a FIXTURE home in a fresh temp directory — never the real
// `~/.claude` — and every `toSvg` fixture is a literal string here, never the real plugin tree.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generatorFor, generatorIds } from "../../src/diagrams/generators.mjs";

const ID = generatorIds()[0];
const KEY = `${ID}@${ID}`;
const SKILL_REL = ["skills", ID, "SKILL.md"];

async function withHome(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-diagram-home-"));
  try {
    return await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function writeSkill(root) {
  const skill = path.join(root, ...SKILL_REL);
  await mkdir(path.dirname(skill), { recursive: true });
  await writeFile(skill, "# skill\n", "utf8");
  return path.resolve(skill);
}

async function writeRegistry(home, entries, raw) {
  const dir = path.join(home, ".claude", "plugins");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "installed_plugins.json"),
    raw ?? JSON.stringify({ version: 2, plugins: { [KEY]: entries } }),
    "utf8",
  );
}

const installEntry = (installPath, lastUpdated, projectPath = "C:/elsewhere/other-repo") => ({
  scope: "project",
  projectPath,
  installPath,
  version: "2.6.27",
  lastUpdated,
});

async function listing(root) {
  const out = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      out.push(path.relative(root, full));
      if (entry.isDirectory()) await walk(full);
    }
  };
  await walk(root);
  return out.sort();
}

const FONT = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap";
const html = (svg, head = "") => `<!doctype html><html><head>${head}</head><body><h1>t</h1>${svg}</body></html>`;
const FIXTURES = {
  "one-svg.html": html('<svg viewBox="0 0 1000 480"><rect width="10" height="10"/></svg>', `<link rel="stylesheet" href="${FONT}">`),
  "has-defs.html": html('<svg viewBox="0 0 10 10"><defs><marker id="m"/></defs><rect/></svg>', `<link href="${FONT}" rel="stylesheet">`),
  "rgba.html": html('<svg viewBox="0 0 10 10"><rect fill="rgba(45, 49, 66, 0.03)" stroke="rgba(11,13,11,.5)"/><rect fill="transparent"/></svg>'),
  "two-svgs.html": html('<svg viewBox="0 0 10 10"><g id="first"/></svg><svg viewBox="0 0 20 20"><g id="second"/></svg>'),
  "aria.html": html('<svg viewBox="0 0 10 10" role="img" aria-labelledby="t1 d1"><title id="t1">Seam</title><desc id="d1">The seam.</desc><rect/></svg>', `<link href="${FONT}" rel="stylesheet">`),
  "no-svg.html": html("<p>nothing</p>"),
  "no-viewbox.html": html('<svg width="10" height="10"><rect/></svg>'),
};

// A small well-formedness check: balanced tags, quoted attributes, and no bare `&`.
function assertWellFormedXml(text) {
  const body = text.replace(/^<\?xml[^?]*\?>\s*/, "");
  assert.doesNotMatch(body, /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i, "no bare & in the XML");
  const stack = [];
  for (const match of body.matchAll(/<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    const [, closing, name, , selfClosing] = match;
    if (selfClosing) continue;
    if (closing) assert.equal(stack.pop(), name, `</${name}> closes the open element`);
    else stack.push(name);
  }
  assert.deepEqual(stack, [], "every element is closed");
  const tags = body.match(/<[^>]+>/g) ?? [];
  const parsed = [...body.matchAll(/<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)].length;
  assert.equal(parsed, tags.length, "every tag parses with quoted attributes");
}

export const diagramGeneratorTests = [
  {
    name: "133/01 task 02: the registry holds one adapter, keyed by its own id, with the whole contract",
    run: () => {
      assert.deepEqual(generatorIds(), ["diagram-design"]);
      const adapter = generatorFor("diagram-design");
      assert.deepEqual(Object.keys(adapter).sort(), ["id", "instructions", "locate", "readBack", "sourceExt", "toSvg"]);
      assert.equal(adapter.id, "diagram-design");
      assert.equal(adapter.sourceExt, ".html");
      assert.equal(adapter.readBack, null);
      assert.ok(Object.isFrozen(adapter));
      assert.equal(generatorFor("mermaid"), null);
    },
  },
  {
    name: "133/01 task 02: locate finds the newest installed skill of any scope, then the marketplace clone",
    run: async () => {
      const adapter = generatorFor(ID);
      await withHome(async (home) => {
        const a = path.join(home, "cache", "A");
        const skillA = await writeSkill(a);
        await writeRegistry(home, [installEntry(a, "2026-01-01T00:00:00Z")]);
        assert.deepEqual(adapter.locate({ home }), { ok: true, skill: skillA }, "one project-scope entry for another repo");
      });
      await withHome(async (home) => {
        const a = path.join(home, "cache", "A");
        const b = path.join(home, "cache", "B");
        await writeSkill(a);
        const skillB = await writeSkill(b);
        await writeRegistry(home, [installEntry(a, "2026-01-01T00:00:00Z"), installEntry(b, "2026-06-01T00:00:00Z")]);
        assert.deepEqual(adapter.locate({ home }), { ok: true, skill: skillB }, "the newest lastUpdated wins");
      });
      await withHome(async (home) => {
        const a = path.join(home, "cache", "A");
        const b = path.join(home, "cache", "B");
        const skillA = await writeSkill(a);
        await writeRegistry(home, [installEntry(a, "2026-01-01T00:00:00Z"), installEntry(b, "2026-06-01T00:00:00Z")]);
        assert.deepEqual(adapter.locate({ home }), { ok: true, skill: skillA }, "an entry whose SKILL.md is missing is skipped");
      });
      await withHome(async (home) => {
        await writeRegistry(home, [], JSON.stringify({ version: 2, plugins: { "other@other": [] } }));
        const clone = await writeSkill(path.join(home, ".claude", "plugins", "marketplaces", ID));
        assert.deepEqual(adapter.locate({ home }), { ok: true, skill: clone }, "no entry → the marketplace clone");
      });
      await withHome(async (home) => {
        await writeRegistry(home, null, "{ not json");
        const clone = await writeSkill(path.join(home, ".claude", "plugins", "marketplaces", ID));
        assert.deepEqual(adapter.locate({ home }), { ok: true, skill: clone }, "a registry that is not JSON → the clone");
      });
      await withHome(async (home) => {
        const answer = adapter.locate({ home });
        assert.equal(answer.ok, false);
        assert.equal(answer.code, "diagram-generator-missing");
        assert.equal(typeof answer.fix, "string");
      });
    },
  },
  {
    name: "133/01 task 02: a missing generator says how to get it, and aof installs nothing",
    run: async () => {
      await withHome(async (home) => {
        const before = await listing(home);
        const answer = generatorFor(ID).locate({ home });
        assert.match(answer.fix, /\/plugin marketplace add \S+/);
        assert.match(answer.fix, /\/plugin install \S+/);
        assert.deepEqual(await listing(home), before);
      });
    },
  },
  {
    name: "133/01 task 02: the instructions carry the paths, the style, the brief and the limits",
    run: () => {
      const root = path.resolve(os.tmpdir(), "P");
      const source = path.join(root, "wiki", "work", "133_m", "diagrams", "ADR-002-generator-seam.html");
      const style = path.join(root, ".aof", "diagrams", "style.md");
      const skill = path.resolve(os.tmpdir(), "skill", "SKILL.md");
      const text = generatorFor(ID).instructions({ brief: "Draw the seam.", paths: { source }, style, skill });
      assert.ok(text.includes(skill), "the absolute skill path");
      assert.ok(text.includes(style), "the absolute style path");
      assert.ok(text.includes("Draw the seam."), "the brief verbatim");
      assert.ok(text.includes(source), "the absolute source path");
      assert.match(text, /skip the skill's §0 onboarding step/);
      assert.match(text, /do not pause for confirmation/);
      assert.match(text, /write nothing else/);
      assert.match(text, /Do not export/);
      for (const candidate of text.match(/\S+\.(?:md|html)\b/g) ?? []) {
        assert.ok(path.isAbsolute(candidate), `every path is absolute: ${candidate}`);
      }
    },
  },
  {
    name: "133/01 task 02: with no style, the instructions use the shipped guide and still skip onboarding",
    run: () => {
      const text = generatorFor(ID).instructions({
        brief: "Draw it.",
        paths: { source: path.resolve(os.tmpdir(), "x.html") },
        style: null,
        skill: path.resolve(os.tmpdir(), "SKILL.md"),
      });
      assert.doesNotMatch(text, /style\.md/);
      assert.match(text, /shipped style guide as-is/);
      assert.match(text, /skip the skill's §0 onboarding step/);
    },
  },
  {
    name: "133/01 task 02: toSvg follows the plugin's export procedure",
    run: () => {
      const { toSvg } = generatorFor(ID);
      const one = toSvg(FIXTURES["one-svg.html"]);
      assert.ok(one.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.match(one, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1000 480">/);
      assert.equal(one.match(/<defs>/g).length, 1);
      assert.ok(one.includes(`@import url('${FONT.replace(/&/g, "&amp;")}')`), "the font @import with each & escaped");
      assert.equal((one.match(/&amp;/g) ?? []).length, 2);

      const defs = toSvg(FIXTURES["has-defs.html"]);
      assert.equal(defs.match(/<defs\b/g).length, 1, "exactly one <defs>");
      assert.match(defs, /<defs><style>@import url\('[^']+'\);<\/style><marker id="m"\/><\/defs>/);

      const rgba = toSvg(FIXTURES["rgba.html"]);
      assert.ok(rgba.includes('fill="#2d3142" fill-opacity="0.03"'));
      assert.ok(rgba.includes('stroke="#0b0d0b" stroke-opacity=".5"'));
      assert.ok(rgba.includes('fill="none"'));
      assert.equal(rgba.includes("rgba("), false);

      const two = toSvg(FIXTURES["two-svgs.html"]);
      assert.ok(two.includes('id="first"'));
      assert.equal(two.includes('id="second"'), false);

      const aria = toSvg(FIXTURES["aria.html"]);
      assert.ok(aria.includes('role="img"'));
      assert.ok(aria.includes('aria-labelledby="t1 d1"'));
      assert.ok(aria.includes('<title id="t1">Seam</title>'));
      assert.ok(aria.includes('<desc id="d1">The seam.</desc>'));
      assert.match(aria, /<svg [^>]*><title id="t1">Seam<\/title><desc id="d1">The seam\.<\/desc><defs>/, "the title stays the first child");

      const code = (fixture) => {
        try {
          toSvg(FIXTURES[fixture]);
        } catch (error) {
          return error.code;
        }
        return null;
      };
      assert.equal(code("no-svg.html"), "diagram-source-no-svg");
      assert.equal(code("no-viewbox.html"), "diagram-svg-no-viewbox");
    },
  },
  {
    name: "133/01 task 02: the SVG is deterministic and parses as XML",
    run: () => {
      const { toSvg } = generatorFor(ID);
      const first = toSvg(FIXTURES["one-svg.html"]);
      assert.equal(toSvg(FIXTURES["one-svg.html"]), first);
      assertWellFormedXml(first);
      assertWellFormedXml(toSvg(FIXTURES["aria.html"]));
    },
  },
];
