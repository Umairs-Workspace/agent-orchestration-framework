// test/support/story-depends-fixture.mjs — the temp-dir work-stream builder story 65's
// two work-layer suites share (tasks 00 and 01).
//
// WHY A SHARED SUPPORT MODULE rather than a third copy of `buildStream`. Both suites need
// the SAME thing that no existing fixture builds: a milestone whose STORIES carry
// `depends`. `test/work/lifecycle/work-next.test.mjs`'s builder is module-private and — measured at HEAD,
// 2026-08-15 — every one of its 600 lines' `depends` is driver-level, so extending it in
// place would have meant editing a locked story's own fixture. One home, two consumers.
//
// The shape mirrors that builder exactly (folder NAMES carry identity `NN_type_slug`,
// record docs carry status + inline `depends`), so a reader moving between the three files
// meets one convention.
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function frontmatter(fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
    .join("\n");
  return `---\n${body}\n---\n`;
}

// A driver spec: { number, type?, slug?, status, depends?, stories? }.
// A story spec:  { number, slug?, status, depends? } — `depends` is the NEW axis, and it
// may be authored either as a bare sibling number ("00") or as a full ref ("53/00").
export async function buildStream(drivers, { prefix = "aof-story-depends-" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  const work = path.join(root, "work");

  for (const driver of drivers) {
    const type = driver.type ?? "milestone";
    const slug = driver.slug ?? `${type}-${driver.number}`;
    const dir = path.join(work, `${driver.number}_${type}_${slug}`);
    await mkdir(dir, { recursive: true });

    const doc = type === "uat" ? "SESSION.md" : type === "spike" ? "SPIKE.md" : type === "chore" ? "CHORE.md" : "SPEC.md";
    await writeFile(
      path.join(dir, doc),
      frontmatter({
        type,
        number: driver.number,
        slug,
        status: driver.status,
        created: "2026-01-01",
        updated: "2026-01-02",
        schema: 1,
        ...(driver.depends ? { depends: driver.depends } : {}),
      }),
    );

    for (const story of driver.stories ?? []) {
      const storySlug = story.slug ?? `story-${story.number}`;
      const storyDir = path.join(dir, "stories", `${story.number}_story_${storySlug}`);
      await mkdir(path.join(storyDir, "tasks"), { recursive: true });
      await writeFile(
        path.join(storyDir, "STORY.md"),
        frontmatter({
          type: "story",
          number: story.number,
          slug: storySlug,
          status: story.status,
          created: "2026-01-01",
          updated: "2026-01-02",
          parent: driver.number,
          schema: 1,
          ...(story.depends ? { depends: story.depends } : {}),
        }),
      );
      if (story.feature != null) {
        await writeFile(path.join(storyDir, "tasks", "00_thing.feature"), story.feature);
      }
    }
  }

  return { root, work };
}

export async function withStream(drivers, body, options) {
  const { root, work } = await buildStream(drivers, options);
  try {
    return await body(work, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// The closed tag vocabulary `validateWork` is handed (the work-validate.test.mjs shape).
export const VALIDATE_CONFIG = { work: { tags: { layers: [], refinements: [], domains: [] } } };

export const hasFinding = (findings, substring) => findings.some((finding) => finding.problem.includes(substring));
