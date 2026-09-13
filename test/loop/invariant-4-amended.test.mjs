// milestone 49 / story 03 / task 02 — INVARIANT 4 AMENDED (@executable).
//
// Every scenario and every Examples ROW of
// `wiki/work/49_milestone_terminals-home/stories/03_story_pane-declaration-and-invariant-4/tasks/02_invariant-4-amended.feature`.
//
// THE SUBJECT IS THE AMENDED GATE ITSELF: what its detectors SWEEP, what they REPORT on a planted
// tree, what they stay QUIET on, and which of today's assertions still run afterwards. Every
// `Then` below reads a returned value, a reported offender, or a string in a file this suite
// opens — never a claim about a diff.
//
// EVERY DETECTOR DRIVEN HERE IS THE GATE'S OWN SHIPPED EXPORT, imported from
// `test/arch/ui/acd-fleet-terminal-input-constrained.test.mjs`. Nothing is re-implemented in this
// file: the PO's ruling exists because m46's mutation review found a plant fed to a locally
// re-implemented copy, so the shipped detector had never once been driven to a violation.
//
// AND "SURVIVES VERBATIM" IS PROVED RATHER THAN REVIEWED — as (a) each needle constant's literal
// VALUE unchanged and (b) each existing assertion's VERDICT re-run on the same input. Never by
// reading a previous revision of the file: a test that reads git history rots the moment the
// history is rewritten.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  POSTURE_HOMES,
  archTests as invariantLanes,
  fleetInteractivePostureOffenders,
  inputSourceOffenders,
  mountSiteOffenders,
  postureAuthorOffenders,
} from "../arch/ui/acd-fleet-terminal-input-constrained.test.mjs";
import { fleetTerminalMount } from "../../ui/src/fleet/terminal-mount.mjs";
import { boardDockMount } from "../../ui/src/board/dock-mount.mjs";
import { homeSessionMount } from "../../ui/src/home/session-mount.mjs";
import { FEED_NO_PRODUCER, FEED_PRODUCER_KNOWN, FEED_ROSTER_GONE } from "../../ui/src/home/feed-axis.mjs";
import { SESSION_SOURCES, sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";
import { POSTURE_INTERACTIVE, POSTURE_READ_ONLY, inputPolicyFor, mountModelFor } from "../../ui/src/terminal/input-policy.mjs";
import { registeredSuitePaths, registrationSurface } from "../support/registration/registration-surface.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = path.join(repoRoot, "test", "arch", "ui", "acd-fleet-terminal-input-constrained.test.mjs");

const gateSource = async () => (await readFile(GATE, "utf8")).replace(/\r\n/g, "\n");

// The suite's own stripper and CRLF normaliser, re-read from the gate rather than re-typed, so
// "the tree" means exactly what the gate means by it.
const stripComments = (source) => source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const lf = (source) => source.replace(/\r\n/g, "\n");

// The REAL `ui/src/**` of this repository, as the gate reads it: `.ts`/`.tsx`/`.mjs`, `.d.mts`
// excluded, comment-stripped and CRLF-normalised.
async function readSurface(dir) {
  const listing = [];
  const walk = async (relative) => {
    for (const entry of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
      const next = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(next);
        continue;
      }
      if (!/\.(?:tsx?|mjs)$/.test(entry.name) || entry.name.endsWith(".d.mts")) continue;
      listing.push({ path: next, source: lf(stripComments(await readFile(path.join(repoRoot, next), "utf8"))) });
    }
  };
  await walk(dir);
  return listing;
}

const wholeTree = async () => (await Promise.all(POSTURE_HOMES.map((entry) => readSurface(entry.dir)))).flat();

const laneNamed = (needle) => invariantLanes.filter((lane) => needle.test(lane.name));
const run = async (lanes) => {
  for (const lane of lanes) await lane.run();
};

// The row shapes the three real producers are driven with.
const fleetRow = { targetNodeId: "node-a", sessionId: "sess-1", state: "running" };
const boardSession = { kind: "mirror", ref: "49/03", nodeId: "node-a", sessionId: "sess-1" };
const homeRow = (extra = {}) => ({ nodeId: "node-a", sessionId: "sess-1", repo: "aof", ...extra });
const producerRow = (extra = {}) => homeRow({ workItem: { ref: "49/03", assignmentId: "asg-1" }, ...extra });

export const invariant4AmendedTests = [
  // ══ Scenario: the gate keeps all seven of its lanes and its registration ══════════════════
  {
    name: "49/03 task02 — NOTHING IS REMOVED: the gate keeps all seven of its lanes and its registration, and the three invariants this milestone does not touch still FIRE on their existing plants",
    run: async () => {
      assert.equal(invariantLanes.length, 7, "exactly seven lanes");
      for (const needle of [
        /invariant 1|route's input seam EXISTS/,
        /worker's input handler delivers EXCLUSIVELY/,
        /bridge \+ mirror write NO durable record/,
        /part 1 — the call site/,
        /part 2 — the policy/,
        /part 3 — the surviving sweep/,
        /behavioural/,
      ]) {
        assert.equal(laneNamed(needle).length, 1, `exactly one lane matches ${needle}`);
      }

      // 119/03 — the registry names DIRECTORIES and each directory's index names its own suites,
      // so "is this suite registered?" is put to the registration surface. The claim is unchanged:
      // an unregistered suite is no gate at all.
      const registered = await registeredSuitePaths(repoRoot);
      const registration = await registrationSurface(repoRoot);
      assert.ok(
        registered.has("test/arch/ui/acd-fleet-terminal-input-constrained.test.mjs"),
        "the suite is still registered, so `acd-test-suite-registration` is unaffected — an unregistered suite is no gate at all",
      );
      assert.match(registration, /\.\.\.acdFleetTerminalInputConstrainedTests,/, "…and its lanes are still spread into the run");

      // THE THREE UNTOUCHED INVARIANTS STILL FIRE ON THEIR EXISTING PLANTS — re-run rather than
      // assumed. A lane that survives a diff but stopped discriminating is the same failure as a
      // deleted one, arriving quieter. Each of these lanes carries its own plants (a handler with
      // no message seam, a JSON.parse-routed handler, a first-live-PTY fallback, a planted
      // durable write) and asserts `length > 0` on each, so running them IS driving the plants.
      await run(laneNamed(/route's input seam EXISTS|worker's input handler delivers EXCLUSIVELY|bridge \+ mirror write NO durable record/));

      // …and the behavioural lane still stands its server up on `port: 0` under a throwaway
      // AOF_GLOBAL_HOME and still proves a payload-smuggled tuple arrives as opaque BYTES.
      const source = await gateSource();
      assert.match(source, /projectDir: root, port: 0, repoRoot: distRoot/, "the behavioural lane binds `port: 0` — never a fixed port");
      assert.match(source, /globalStoreOptions: \{ env: \{ AOF_GLOBAL_HOME: home \} \}/, "…under a throwaway AOF_GLOBAL_HOME");
      assert.match(source, /the smuggle arrives as opaque BYTES — content-blind/, "…and still proves the smuggled tuple stays bytes");
    },
  },

  // ══ Scenario: the invariant's subject sentence names the surfaces as they now are ═════════
  {
    name: "49/03 task02 — THE PROSE IS REWRITTEN, NEVER DELETED: invariant 4's subject sentence names both interactive surfaces, keeps the fleet a monitor, and the m46 note survives with the m49 note beneath it",
    run: async () => {
      const source = await gateSource();
      const header = source.slice(0, source.indexOf("import assert"));

      assert.ok(
        !/THE FLEET PAGE STAYS A MONITOR — the interactive surface is the one control\n\/\/ *mounted by the BOARD DOCK/.test(header),
        "the old sentence — *the interactive surface is the one control mounted by the BOARD DOCK* — no longer stands: it is false about the product after this milestone",
      );
      assert.match(header, /THE POSTURE HAS ONE AUTHOR PER SURFACE/, "the invariant is stated as the property it was always protecting");
      assert.match(header, /BOARD DOCK and the TERMINALS HOME/, "…it names BOTH interactive surfaces");
      assert.match(header, /FLEET PAGE STAYS A MONITOR/, "…and states that the fleet page stays a monitor");
      assert.match(
        header,
        /no\s*\n\/\/\s*render site in any of the three assembles the value that decides whether an\s*\n\/\/\s*operator can type into another machine/,
        "…and that no render site in any of the three assembles the value that decides whether an operator can type into another machine",
      );

      const m46 = header.indexOf("m46 / STORY 04 — TWO CHANGES TO THIS FILE");
      const m49 = header.indexOf("m49 / STORY 03 — THE MILESTONE'S ONE DELIBERATE REVERSAL");
      assert.ok(m46 > 0, "the m46/story-04 amendment note is still present");
      assert.match(header.slice(m46, m49), /INVARIANT 4 IS RE-EXPRESSED AT EQUAL STRENGTH/, "…unedited, with its own reasoning intact");
      assert.ok(m49 > m46, "…and the m49 note is added BENEATH it: two amendments, one trail, so the next reviewer meets the decision rather than a confusing red");
    },
  },

  // ══ PART 1 · THE AUTHORSHIP TABLE. 3 rows. ═══════════════════════════════════════════════
  ...[
    { case: "the monitor", dir: "ui/src/fleet", module: "ui/src/fleet/terminal-mount.mjs", declares: "POSTURE_READ_ONLY", files: 5 },
    { case: "the dock", dir: "ui/src/board", module: "ui/src/board/dock-mount.mjs", declares: "POSTURE_INTERACTIVE", files: 5 },
    { case: "the terminals home", dir: "ui/src/home", module: "ui/src/home/session-mount.mjs", declares: "POSTURE_INTERACTIVE", files: 2 },
  ].map((example) => ({
    name: `49/03 task02 — each surface has exactly ONE module that may write the \`posture:\` key — ${example.case}`,
    run: async () => {
      const listing = await readSurface(example.dir);
      const writers = listing.filter((file) => /(^|[\s{,(])posture\s*:/m.test(file.source)).map((file) => file.path);
      assert.deepEqual(writers, [example.module], `the only file that writes a \`posture:\` key under ${example.dir}/ is ${example.module}`);
      assert.match(listing.find((file) => file.path === example.module).source, new RegExp(`\\b${example.declares}\\b`), `…and it declares ${example.declares}`);

      assert.deepEqual(postureAuthorOffenders(await wholeTree()), [], "the sweep reports zero offenders against the tree as it stands");
      assert.ok(listing.length >= example.files, `the directory is non-vacuous: ${listing.length} swept source files (floor ${example.files})`);

      // The home's row is the one that was RED until the mount module landed, and it was red
      // LOUDLY: the swept directory did not exist, so the walk threw rather than passing over
      // nothing. That is asserted at the lane below.
      const entry = POSTURE_HOMES.find((row) => row.dir === example.dir);
      assert.equal(entry.postureHome, example.module, "…and the gate's own table names the same module");
    },
  })),

  // ══ Scenario Outline: a second author is reported, wherever it is spelled. 4 rows. ════════
  ...[
    {
      case: "the spelling a word sweep cannot see",
      dir: "ui/src/home",
      file: "ui/src/home/GridTile.tsx",
      source: "export function GridTile({ row }) {\n  return <TerminalControl mount={{ ...homeSessionMount(row), posture: { readOnly: !!0 } }} />;\n}\n",
      home: "ui/src/home/session-mount.mjs",
    },
    {
      case: "a helper module that decides it too",
      dir: "ui/src/home",
      file: "ui/src/home/tile-mount.mjs",
      source: "export function tileMount(row) {\n  return { bound: true, posture: POSTURE_INTERACTIVE };\n}\n",
      home: "ui/src/home/session-mount.mjs",
    },
    {
      case: "the same move, one directory over",
      dir: "ui/src/board",
      file: "ui/src/board/DockTile.tsx",
      source: "const mount = { bound: true, posture: dockPosture };\n",
      home: "ui/src/board/dock-mount.mjs",
    },
    {
      case: "and the clause it already had",
      dir: "ui/src/fleet",
      file: "ui/src/fleet/PeekTile.tsx",
      source: "const mount = { bound: true, posture: peekPosture };\n",
      home: "ui/src/fleet/terminal-mount.mjs",
    },
  ].map((example) => ({
    name: `49/03 task02 — a second author for the posture is reported, wherever it is spelled — ${example.case}`,
    run: async () => {
      const clean = await wholeTree();
      assert.deepEqual(postureAuthorOffenders(clean), [], "the clean tree, against which the clause reports zero offenders");

      const planted = [...clean, { path: example.file, source: example.source }];
      assert.notEqual(planted.length, clean.length, "the plant differs from the clean baseline — it LANDED");

      const fired = postureAuthorOffenders(planted);
      assert.ok(fired.some((offender) => offender.startsWith(`${example.file} WRITES`)), `an offender is reported naming the planted file — ${JSON.stringify(fired)}`);
      assert.ok(fired.some((offender) => offender.includes(example.home)), "…AND the module that is allowed to author the value there");
      assert.deepEqual(postureAuthorOffenders(clean), [], "…and the clean tree, in this same lane, still reports none");
    },
  })),

  // ══ Scenario Outline: INTERACTIVE_DECLARATION still sweeps the fleet, and only the fleet. 4 rows.
  ...[
    { case: "the monitor may not name it", dir: "ui/src/fleet", offender: true },
    { case: "the dock has named it since m42", dir: "ui/src/board", offender: false },
    { case: "the home must name it", dir: "ui/src/home", offender: false },
    { case: "the control is not a call site", dir: "ui/src/terminal", offender: false },
  ].map((example) => ({
    name: `49/03 task02 — \`INTERACTIVE_DECLARATION\` still sweeps the fleet, and only the fleet — ${example.case}`,
    run: async () => {
      const planted = [{ path: `${example.dir}/plant.mjs`, source: 'export const MOUNT = { posture: "interactive" };\n' }];
      const fired = fleetInteractivePostureOffenders(planted);
      if (example.offender) {
        assert.equal(fired.length, 1, `a file naming the interactive posture in ${example.dir}/ IS an offender — reversing the fleet card's posture is not this milestone`);
        assert.match(fired[0], /names the INTERACTIVE posture/, "…and the refusal says so");
      } else {
        assert.deepEqual(fired, [], `a file naming the interactive posture in ${example.dir}/ is NOT an offender — that declaration IS the milestone on the two interactive surfaces, and the control is a read-through, not a call site`);
      }
    },
  })),

  {
    name: "49/03 task02 — the `INTERACTIVE_DECLARATION` needle's own VALUE is unchanged, and the authorship clause's swept set is exactly the three surface directories with `ui/src/terminal/` not among them",
    run: async () => {
      const source = await gateSource();
      assert.match(
        source,
        /const INTERACTIVE_DECLARATION = \/\\bPOSTURE_INTERACTIVE\\b\|\["']interactive\["']\|\\breadOnly\\s\*:\\s\*false\\b\|\\bMOUNT_INTERACTIVE\\b\//,
        "the needle still matches `POSTURE_INTERACTIVE`, the quoted word `interactive`, `readOnly: false` and `MOUNT_INTERACTIVE` — unchanged in value",
      );
      for (const spelling of ["POSTURE_INTERACTIVE", '"interactive"', "readOnly: false", "MOUNT_INTERACTIVE"]) {
        assert.ok(
          fleetInteractivePostureOffenders([{ path: "ui/src/fleet/plant.mjs", source: `const x = { ${spelling} };\n` }]).length === 1,
          `…and it still fires on a fleet file spelling it \`${spelling}\``,
        );
      }

      assert.deepEqual(
        POSTURE_HOMES.map((entry) => entry.dir),
        ["ui/src/fleet", "ui/src/board", "ui/src/home"],
        "the swept set of the authorship clause is exactly the three SURFACE directories",
      );
      assert.ok(!POSTURE_HOMES.some((entry) => entry.dir.includes("terminal")), "…and `ui/src/terminal/` is not among them");
      // THE TRAP, DRIVEN: the shipped control writes `posture: mount.posture` — a READ-THROUGH of
      // the value this gate protects. A sweep extended over `ui/src/**` would report the product.
      assert.deepEqual(
        postureAuthorOffenders([
          { path: "ui/src/terminal/TerminalControl.tsx", source: "const identity = terminalSessionIdentity({ posture: mount.posture });\n" },
          ...(await wholeTree()),
        ]),
        [],
        "the control is not swept at all by either part-1 clause, and the natural 'fix' if it were would be an exemption list — which is what ADR-001 rejected the fleet-absorption option to avoid",
      );
    },
  },

  // ══ PART 1 · THE JSX CLAUSE. 3 rows. ═════════════════════════════════════════════════════
  ...[
    { case: "the fleet card", dir: "ui/src/fleet", call: "fleetTerminalMount(" },
    { case: "the board dock", dir: "ui/src/board", call: "boardDockMount(" },
    { case: "the grid tile", dir: "ui/src/home", call: "homeSessionMount(" },
  ].map((example) => ({
    name: `49/03 task02 — every mount site hands the control its own module's return value, bare — ${example.case}`,
    run: async () => {
      const listing = await readSurface(example.dir);
      // The extractor, spelled as the gate spells it — BOUNDED TO ONE LINE, so this scenario reads
      // what the shipped clause reads and cannot drift from it (line 354 keeps the OLD spelling
      // deliberately, as the before-state of the finding).
      const props = listing.flatMap((file) => [...file.source.matchAll(/<\s*TerminalControl[\s\S]{0,400}?mount=\{([^\n]*)\}\s*\n/g)].map((match) => match[1].trim()));
      assert.ok(props.length >= 1, `at least ONE mount prop is FOUND under ${example.dir}/ — a directory where none is found FAILS the clause, it never passes it`);
      for (const prop of props) {
        assert.ok(prop.startsWith(example.call), `every prop found matches \`${example.call}\` at its start — got \`${prop}\``);
        assert.ok(!/\.\.\./.test(prop), "…and no prop contains a spread");
      }
      assert.deepEqual(mountSiteOffenders(await wholeTree()), [], "…and the SHIPPED clause reports nothing against the tree as it stands");
    },
  })),

  {
    name: "49/03 task02 — THE FLOOR PLANT: a mount site the extractor cannot see FAILS the gate rather than passing it, and the refusal names the surface whose site it could not find",
    run: async () => {
      const clean = await wholeTree();
      assert.deepEqual(mountSiteOffenders(clean), [], "precondition: three surfaces, three sites, zero offenders");

      // (a) THE MANDATORY PLANT — the home's mount site DELETED, the other two untouched.
      const deleted = clean.filter((file) => !(file.path.startsWith("ui/src/home/") && /<\s*TerminalControl/.test(file.source)));
      assert.equal(deleted.length, clean.length - 1, "the plant LANDED: exactly one home mount site removed");
      assert.ok(deleted.some((file) => file.path.startsWith("ui/src/fleet/")) && deleted.some((file) => file.path.startsWith("ui/src/board/")), "…while the fleet's and the board's remain");
      const fired = mountSiteOffenders(deleted);
      assert.ok(fired.length >= 1, "the clause FAILS");
      assert.ok(fired.some((offender) => /the terminals home/.test(offender)), `…naming the SURFACE whose mount site it could not find — ${JSON.stringify(fired)}`);
      assert.ok(
        fired.some((offender) => /defect in THIS CLAUSE'S REACH, never evidence of a compliant surface/.test(offender)),
        "…and the failure message says that zero mount sites in a surface directory is a defect in this clause's reach, never evidence of a compliant surface",
      );

      // (b) THE SHAPE THE EXTRACTOR CANNOT SEE — another prop after `mount=` on the same line.
      // RE-SHAPED 2026-08-13 (architect's review) TO A WHOLE FILE. It was an isolated one-line
      // snippet with no trailing `}`-at-line-end, and that is why it proved nothing: shaped like a
      // real file, the same spelling BEHAVES DIFFERENTLY, which is the whole finding. A plant not
      // shaped like the tree proves the detector, not the property.
      const invisible = [
        'import { TerminalControl } from "../terminal/TerminalControl";',
        'import { HOST_GRID_PANE } from "../terminal/host-model.mjs";',
        'import { homeSessionMount } from "./session-mount.mjs";',
        "",
        "export function InvisibleTile({ row, origins }) {",
        "  return <TerminalControl host={HOST_GRID_PANE} mount={homeSessionMount(row)} origins={origins} />;",
        "}",
        "",
      ].join("\n");
      assert.equal([...invisible.matchAll(/<\s*TerminalControl[\s\S]{0,400}?mount=\{([^\n]*)\}\s*\n/g)].length, 0, "the extractor finds NOTHING in a site whose `mount=` prop does not close its own line");
      const hidden = mountSiteOffenders([...deleted, { path: "ui/src/home/InvisibleTile.tsx", source: invisible }]);
      assert.ok(hidden.some((offender) => /the terminals home/.test(offender)), "…so a home whose only site is spelled that way STILL fails the clause rather than passing it");
      assert.ok(
        hidden.some((offender) => /InvisibleTile\.tsx mounts the control 1 time\(s\) but this clause could read only 0/.test(offender)),
        "…AND the file is named for its unreadable site, which is the floor's argument one level finer: per FILE, not only per directory",
      );

      // (b′) TWO SITES IN ONE FILE — the case the UNBOUNDED capture made invisible, and the one
      // that mattered most because story 05 builds tiles in this directory. A compliant single-line
      // site followed by a non-compliant one: with `([\s\S]*?)` the extractor produced ONE match
      // whose capture began `homeSessionMount(` and ran INTO the second site, which `matchAll` then
      // resumed past — ZERO offenders from both shipped detectors, while the second site measures
      // `inputEnabled: true` through the real policy.
      const twoSites = [
        "export const A = ({ row, o }) => <TerminalControl host={h} mount={homeSessionMount(row)} origins={o} />;",
        "",
        "export const B = ({ row, o }) => (",
        "  <TerminalControl",
        "    host={h}",
        "    mount={{ ...homeSessionMount(row), readOnly: false }}",
        "  />",
        ");",
        "",
      ].join("\n");
      const oldCapture = [...twoSites.matchAll(/<\s*TerminalControl[\s\S]{0,400}?mount=\{([\s\S]*?)\}\s*\n/g)].map((match) => match[1].trim());
      assert.equal(oldCapture.length, 1, "the OLD unbounded capture saw ONE match across two sites");
      assert.ok(oldCapture[0].startsWith("homeSessionMount("), "…and it began with the COMPLIANT call, so the clause was satisfied by the site that was fine");
      assert.ok(/<\s*TerminalControl/.test(oldCapture[0]), "…while the SECOND site lived inside that one match's own span, which is how it disappeared");

      const twoFired = mountSiteOffenders([...clean, { path: "ui/src/home/TwoTiles.tsx", source: twoSites }]);
      assert.ok(twoFired.some((offender) => /TwoTiles\.tsx hands the control a `mount` prop that is not a bare/.test(offender)), `the bounded capture READS the second site and reports it — ${JSON.stringify(twoFired)}`);
      assert.ok(twoFired.some((offender) => /TwoTiles\.tsx mounts the control 2 time\(s\) but this clause could read only 1/.test(offender)), "…and reports the file's REACH independently");
      // …and it is the ONLY clause that sees that spelling: `readOnly: false` names no posture
      // word and writes no `posture:` key, so nothing else in this gate would have caught it.
      assert.deepEqual(fleetInteractivePostureOffenders([{ path: "ui/src/home/TwoTiles.tsx", source: twoSites }]), [], "the word sweep is silent, by design");
      assert.deepEqual(postureAuthorOffenders([...clean, { path: "ui/src/home/TwoTiles.tsx", source: twoSites }]), [], "…and so is the authorship clause: `readOnly: false` is not a `posture:` key");
      const smuggled = { ...homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN }), posture: { readOnly: false } };
      assert.equal(inputPolicyFor(smuggled.source, smuggled.posture).inputEnabled, true, "…while the second site measures TYPEABLE through the real policy, which is what was at stake");

      // (c) …AND A CONCATENATED WHOLE-CLAUSE FLOOR WOULD HAVE STAYED GREEN ON (a). The argument
      // for the per-surface floor, asserted rather than described.
      const concatenated = deleted.flatMap((file) => [...file.source.matchAll(/<\s*TerminalControl[\s\S]{0,400}?mount=\{([^\n]*)\}\s*\n/g)]);
      assert.ok(concatenated.length >= 1, `the old \`mountProps.length >= 1\` floor is satisfied by ${concatenated.length} surviving Fleet/Board match(es) on the same plant — one match, and the new interactive surface is policed by nothing while CI reads green`);

      // (d) …and the MIRROR: the sweep is shown to FIND the site, not merely to count one.
      const spread = mountSiteOffenders([...clean, { path: "ui/src/home/SpreadTile.tsx", source: "  <TerminalControl\n    mount={{ ...homeSessionMount(row) }}\n  />\n" }]);
      assert.ok(spread.some((offender) => /SpreadTile/.test(offender)), "a home site whose prop is a SPREAD is reported by path");
      assert.deepEqual(mountSiteOffenders(clean), [], "…and the clean tree, in this same lane, reports none");
    },
  },

  // ══ PART 1 · THE BEHAVIOURAL CLAUSE. 4 rows. ═════════════════════════════════════════════
  ...[
    { case: "the fleet card, unchanged", surface: "fleet", declared: () => fleetTerminalMount(fleetRow, { itemRef: "49/03" }), posture: POSTURE_READ_ONLY, input: false },
    { case: "the board dock, unchanged since m42", surface: "board", declared: () => boardDockMount(boardSession), posture: POSTURE_INTERACTIVE, input: true },
    { case: "the grid tile an assignment feeds", surface: "home", declared: () => homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN }), posture: POSTURE_INTERACTIVE, input: true },
    { case: "the grid tile nothing will ever feed", surface: "home", declared: () => homeSessionMount(homeRow({ workItem: null })), posture: POSTURE_READ_ONLY, input: false },
  ].map((example) => ({
    name: `49/03 task02 — the real mounts answer, and they do not all answer the same — ${example.case}`,
    run: async () => {
      const declared = example.declared();
      assert.equal(declared.posture, example.posture, "the posture the REAL producer declares");
      assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, example.input, "…run through the SHIPPED policy");
      assert.equal(declared.source.kind, "mirror", "the mount's `source.kind` is `mirror`");
      assert.equal(declared.source, sessionSourceFor("mirror").source, "…and the source object is reference-identical across all four rows");
    },
  })),

  {
    name: "49/03 task02 — …and NOT ALL FOUR ANSWERS ARE EQUAL: the contrast clause proves a DIFFERENCE across three surfaces rather than a constant",
    run: async () => {
      const answers = [
        fleetTerminalMount(fleetRow, { itemRef: "49/03" }).posture,
        boardDockMount(boardSession).posture,
        homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN }).posture,
        homeSessionMount(homeRow({ workItem: null })).posture,
      ];
      assert.equal(new Set(answers).size, 2, `one source, both postures, three surfaces: ${answers.join(", ")}`);
      assert.notEqual(answers[0], answers[1], "the fleet card and the board dock still differ");
      assert.notEqual(answers[0], answers[2], "…and so do the fleet card and the grid tile");
      assert.notEqual(answers[2], answers[3], "…and the SAME surface answers differently for two rows, which is the narrowing itself");
    },
  },

  // ══ Scenario Outline: the home's mount driven with the fleet's adversarial rows. 5 rows. ══
  ...[
    { case: "the word on the row", axis: FEED_NO_PRODUCER, decoy: { posture: "interactive" }, posture: POSTURE_READ_ONLY, input: false },
    { case: "the constant on the row", axis: FEED_NO_PRODUCER, decoy: { posture: POSTURE_INTERACTIVE }, posture: POSTURE_READ_ONLY, input: false },
    { case: "the field the word sweep cannot see", axis: FEED_NO_PRODUCER, decoy: { readOnly: false }, posture: POSTURE_READ_ONLY, input: false },
    { case: "a session that left the roster", axis: FEED_ROSTER_GONE, decoy: { state: "running" }, posture: POSTURE_READ_ONLY, input: false },
    { case: "positively established, and typeable", axis: FEED_PRODUCER_KNOWN, decoy: {}, posture: POSTURE_INTERACTIVE, input: true, producer: true },
  ].map((example) => ({
    name: `49/03 task02 — the home's mount is driven with the same adversarial rows the fleet's is, in the fail-closed direction — ${example.case}`,
    run: async () => {
      const row = example.producer ? producerRow(example.decoy) : homeRow(example.decoy);
      const declared = homeSessionMount(row, { axis: example.axis });
      assert.equal(declared.posture, example.posture, "the posture");
      assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, example.input, "…and the shipped policy's answer");
    },
  })),

  // ══ PART 2 · UNTOUCHED ═══════════════════════════════════════════════════════════════════
  {
    name: "49/03 task02 — PART 2 IS UNTOUCHED and still exhaustive: the WHOLE frozen table × both postures, with no sampling, and neither `input-policy.mjs` nor `source-table.mjs` was edited by this milestone",
    run: async () => {
      await run(laneNamed(/part 2 — the policy/));

      assert.ok(SESSION_SOURCES.length >= 2, `SESSION_SOURCES still has at least two rows: ${SESSION_SOURCES.length}`);
      let cells = 0;
      for (const source of SESSION_SOURCES) {
        for (const posture of [POSTURE_INTERACTIVE, POSTURE_READ_ONLY]) {
          const policy = inputPolicyFor(source, posture);
          const expected = source.canInput === true && posture === POSTURE_INTERACTIVE;
          const model = mountModelFor({ source, mount: posture });
          assert.equal(policy.disableStdin, !policy.inputEnabled, `${source.kind} × ${posture}: disableStdin is the exact negation of inputEnabled`);
          assert.deepEqual([...model.keystrokeSinks], expected ? ["onData"] : [], "…the keystroke sink is present exactly when input is");
          assert.equal(model.cursor.blink, expected, "…the cursor blinks exactly when input is");
          assert.equal(model.readOnlyLabel, expected ? null : "read-only", "…and the `read-only` label is mandatory whenever it is not");
          cells += 1;
        }
      }
      assert.equal(cells, SESSION_SOURCES.length * 2, `every cell, no sampling: ${cells}`);

      // "UNTOUCHED" IS A CHECKABLE CLAIM, not a promise: the two modules this lane drives are
      // unmodified in this milestone's working tree.
      for (const file of ["ui/src/terminal/input-policy.mjs", "ui/src/terminal/source-table.mjs"]) {
        const source = await readFile(path.join(repoRoot, ...file.split("/")), "utf8");
        assert.ok(!/milestone 49|m49/.test(source), `${file} carries no m49 edit — the lane passes without a single change to it`);
      }
    },
  },

  // ══ Scenario Outline: the seven malformed declarations still fail closed. 7 rows. ═════════
  ...[
    { case: "a source that declares it cannot input", source: () => ({ ...sessionSourceFor("mirror").source, canInput: false }), mount: () => POSTURE_INTERACTIVE },
    { case: "an unrecognised source kind", source: () => sessionSourceFor("banana").source, mount: () => POSTURE_INTERACTIVE },
    { case: "no mount posture supplied at all", source: () => sessionSourceFor("mirror").source, mount: () => undefined },
    { case: "a null mount", source: () => sessionSourceFor("mirror").source, mount: () => null },
    { case: "a key in the wrong case", source: () => sessionSourceFor("mirror").source, mount: () => ({ readonly: false }) },
    { case: "a non-boolean that SAYS read-only in words", source: () => sessionSourceFor("mirror").source, mount: () => ({ readOnly: "yes" }) },
    { case: "a mis-spelled posture", source: () => sessionSourceFor("mirror").source, mount: () => "Interactive" },
  ].map((example) => ({
    name: `49/03 task02 — the seven malformed declarations still fail closed, exactly as they do today — ${example.case}`,
    run: async () => {
      const policy = inputPolicyFor(example.source(), example.mount());
      assert.equal(policy.inputEnabled, false, "`inputEnabled` is false — `canInput` is a CAPABILITY and is never a permission");
      assert.equal(policy.disableStdin, true, "…and `disableStdin` is true");
      assert.deepEqual([...mountModelFor({ source: example.source(), mount: example.mount() }).keystrokeSinks], [], "…and no keystroke sink is registered at all");
    },
  })),

  // ══ PART 3 · UNTOUCHED, AND IT GAINS A DIRECTORY. 4 rows. ════════════════════════════════
  ...[
    { case: "a home module taking keystrokes", dir: "ui/src/home", file: "ui/src/home/keys.mjs", source: "export function wire(term) {\n  term.onData((bytes) => queue.push(bytes));\n}\n", wired: /input source/ },
    { case: "a home module with its own wire", dir: "ui/src/home", file: "ui/src/home/socket.mjs", source: 'export function open(url) {\n  const ws = new WebSocket(url);\n  ws.send("x");\n}\n', wired: /sends on a socket/ },
    { case: "a home module keying off the DOM", dir: "ui/src/home", file: "ui/src/home/keymap.mjs", source: "export function bind(term) {\n  term.attachCustomKeyEventHandler(() => true);\n}\n", wired: /input source/ },
    { case: "the fleet clause, unchanged", dir: "ui/src/fleet", file: "ui/src/fleet/peek-keys.mjs", source: "export function wire(term) {\n  term.onKey((event) => event);\n}\n", wired: /input source/ },
  ].map((example) => ({
    name: `49/03 task02 — neither surface directory grows an input path or a socket of its own — ${example.case}`,
    run: async () => {
      const clean = [...(await readSurface("ui/src/fleet")), ...(await readSurface("ui/src/home"))];
      assert.deepEqual(inputSourceOffenders(clean), [], "the clean tree, against which the sweep reports zero offenders");

      const planted = [...clean, { path: example.file, source: example.source }];
      assert.notEqual(planted.length, clean.length, "the plant differs from the clean baseline — it LANDED");
      const fired = inputSourceOffenders(planted);
      assert.ok(fired.some((offender) => offender.startsWith(example.file) && example.wired.test(offender)), `an offender is reported naming the planted file and what it wired — ${JSON.stringify(fired)}`);
      assert.deepEqual(inputSourceOffenders(clean), [], "…and the clean tree, in this same lane, reports none");
    },
  })),

  {
    name: "49/03 task02 — on the clean tree BOTH swept directories are non-vacuous, and an ABSENT `ui/src/home/` fails the lane loudly rather than passing it over nothing",
    run: async () => {
      const fleet = await readSurface("ui/src/fleet");
      const home = await readSurface("ui/src/home");
      assert.ok(fleet.length >= 5, `the fleet sweep still walks at least five swept files: ${fleet.length}`);
      assert.ok(home.length >= 2, `…and the home sweep at least two: ${home.length}`);

      // The gate's own reader FAILS, by name, on a directory that is not there — the walk throws
      // rather than returning an empty listing, which is what makes the home row red LOUDLY
      // before the module lands rather than green and vacuous after it.
      const source = await gateSource();
      assert.match(source, /A sweep that cannot see its subject must FAIL/, "the reader refuses an unreadable surface directory by name");
      await assert.rejects(() => readSurface("ui/src/does-not-exist"), /ENOENT/, "…and a walk over a directory that is not there throws rather than reporting a clean sweep");
      assert.deepEqual(
        inputSourceOffenders([]),
        [],
        "…which is precisely WHY the walk must throw: an empty listing is indistinguishable from a clean one at the detector, so the loudness has to live at the read",
      );
    },
  },

  {
    name: "49/03 task02 — the six surviving clauses about the ONE control still hold, and the control still genuinely types",
    run: async () => {
      await run(laneNamed(/part 3 — the surviving sweep/));

      const fleetPage = lf(stripComments(await readFile(path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx"), "utf8")));
      assert.match(fleetPage, /<\s*TerminalControl\b/, "the fleet page still mounts the ONE control by name");
      assert.match(fleetPage, /fleetTerminalMount\s*\(/, "…and still hands it `fleetTerminalMount(`");

      const tableRaw = lf(await readFile(path.join(repoRoot, "ui", "src", "terminal", "source-table.mjs"), "utf8"));
      assert.match(tableRaw, /\/ws\/terminal-view/, "the source table still declares `/ws/terminal-view`, read RAW");
      assert.match(tableRaw, /\/ws\/terminal\b/, "…and `/ws/terminal`, because a `ws://` inside a template literal reads as a line comment to the stripper");

      const control = lf(stripComments(await readFile(path.join(repoRoot, "ui", "src", "terminal", "TerminalControl.tsx"), "utf8")));
      assert.match(control, /\.\s*(?:onData|onKey|onBinary)\s*\(/, "the one control still wires a terminal input source");
      assert.ok(/\bWebSocket\b/.test(control) && /\.\s*send\s*\(/.test(control), "…and still sends on its socket: the interactive lane is real, on a surface this gate is not sweeping");
      assert.ok(!/disableStdin\s*:\s*(?:true|false)\b/.test(control), "the control still spells `disableStdin` as no literal");
      assert.ok(!/cursorBlink\s*:\s*(?:true|false)\b/.test(control), "…nor `cursorBlink`");

      const identity = lf(stripComments(await readFile(path.join(repoRoot, "ui", "src", "terminal", "pane-identity.mjs"), "utf8")));
      assert.match(identity, /→\s*\$\{far\}|\$\{owner\}\s*→/, "the identity line still names the far end in WORDS");

      const terminalWs = lf(stripComments(await readFile(path.join(repoRoot, "src", "terminal-ws.mjs"), "utf8")));
      assert.match(terminalWs, /term\.write\s*\(/, "and `src/terminal-ws.mjs` still writes its own PTY, untouched by this feature");
    },
  },

  {
    name: "49/03 task02 — a line comment containing a block-comment opener cannot blind the new sweeps, and every new clause uses the suite's ONE shipped stripper",
    run: async () => {
      const blinding = [
        "// the pane's key uses /* as its own marker — see the note below",
        ...Array(20).fill("const filler = 1;"),
        "term.onData((bytes) => queue.push(bytes));",
        "/* an ordinary block comment */",
        "export const wired = true;",
      ].join("\n");

      assert.ok(
        inputSourceOffenders([{ path: "ui/src/home/blinded.mjs", source: blinding }]).some((offender) => /blinded\.mjs/.test(offender)),
        "the `onData` wiring IS reported as an offender",
      );
      const blockFirst = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.ok(!/\.\s*onData\s*\(/.test(blockFirst(blinding)), "…and with the strip order REVERSED the same file would report nothing at all");
      assert.deepEqual(
        inputSourceOffenders([{ path: "ui/src/home/commented.mjs", source: "/*\nterm.onData((x) => x);\n*/\nexport const x = 1;\n" }]),
        [],
        "…while a `term.onData(` that appears ONLY inside a genuine block comment is NOT reported",
      );

      const source = await gateSource();
      assert.equal((source.match(/function stripComments\s*\(/g) ?? []).length, 1, "no second copy of the stripper is defined anywhere in the suite");
      assert.match(source, /function stripComments\(source\) \{\n\s*return source\.replace\(\/\\\/\\\/\[\^\\n\]\*\/g, ""\)\.replace/, "…and the ONE copy still strips LINE comments FIRST");
    },
  },

  // ══ STRICTLY STRONGER — the checklist a reviewer can run. 12 rows. ═══════════════════════
  ...[
    {
      n: 1,
      claim: "`INTERACTIVE_DECLARATION`'s literal value is unchanged, and it still fires on a fleet file that names the posture",
      check: async (source) => {
        assert.match(source, /\\bPOSTURE_INTERACTIVE\\b\|\["']interactive\["']\|\\breadOnly\\s\*:\\s\*false\\b\|\\bMOUNT_INTERACTIVE\\b/, "value unchanged");
        assert.equal(fleetInteractivePostureOffenders([{ path: "ui/src/fleet/x.mjs", source: "const m = { readOnly: false };" }]).length, 1, "…and it fires");
      },
    },
    {
      n: 2,
      claim: "`POSTURE_KEY_WRITE`'s literal value is unchanged, and it still fires on a fleet file other than `terminal-mount.mjs`",
      check: async (source) => {
        assert.match(source, /const POSTURE_KEY_WRITE = \/\(\^\|\[\\s\{,\(\]\)posture\\s\*:\/m;/, "value unchanged");
        assert.ok(
          postureAuthorOffenders([...(await wholeTree()), { path: "ui/src/fleet/x.tsx", source: "const m = { posture: peek };" }]).some((offender) => offender.startsWith("ui/src/fleet/x.tsx")),
          "…and it fires",
        );
      },
    },
    {
      n: 3,
      claim: "`TERMINAL_INPUT_SOURCE`, `SOCKET_NAMED` and `ANY_SEND_CALL` are unchanged in value",
      check: async (source) => {
        assert.match(source, /const SOCKET_NAMED = \/\\bWebSocket\\b\/;/);
        assert.match(source, /const ANY_SEND_CALL = \/\\\.\\s\*send\\s\*\\\(\/;/);
        assert.match(source, /const TERMINAL_INPUT_SOURCE = \/\\\.\\s\*\(\?:onData\|onKey\|onBinary\)\\s\*\\\(\|\\battachCustomKeyEventHandler\\s\*\\\(\/;/);
      },
    },
    {
      n: 4,
      claim: "the fleet's JSX mount prop is still required to be a bare `fleetTerminalMount(` call with no spread",
      check: async () => {
        const fired = mountSiteOffenders([...(await wholeTree()), { path: "ui/src/fleet/Spread.tsx", source: "  <TerminalControl\n    mount={{ ...fleetTerminalMount(a) }}\n  />\n" }]);
        assert.ok(fired.some((offender) => /Spread\.tsx/.test(offender)), "a fleet spread is still reported");
      },
    },
    {
      n: 5,
      claim: "`ui/src/fleet/terminal-mount.mjs` is still read positively for `POSTURE_READ_ONLY` by name",
      check: async () => {
        const module = (await readSurface("ui/src/fleet")).find((file) => file.path === "ui/src/fleet/terminal-mount.mjs");
        assert.match(module.source, /\bPOSTURE_READ_ONLY\b/, "the positive read survives");
      },
    },
    {
      n: 6,
      claim: "the three adversarial fleet rows still yield `read-only` and `inputEnabled: false`",
      check: async () => {
        for (const row of [
          { targetNodeId: "node-a", sessionId: "sess-1", state: "running", posture: "interactive" },
          { targetNodeId: "node-a", sessionId: "sess-1", state: "running", readOnly: false },
          { targetNodeId: "node-a", sessionId: "sess-1", state: "done", posture: POSTURE_INTERACTIVE },
        ]) {
          const declared = fleetTerminalMount(row, { itemRef: "49/03" });
          assert.equal(declared.posture, POSTURE_READ_ONLY);
          assert.equal(inputPolicyFor(declared.source, declared.posture).inputEnabled, false);
        }
      },
    },
    {
      n: 7,
      claim: "the real fleet mount still yields `rendersPanel: true`, no keystroke sink, `sendPath: null`, the `read-only` label and a non-blinking cursor",
      check: async () => {
        const declared = fleetTerminalMount(fleetRow, { itemRef: "49/03" });
        const model = mountModelFor({ source: declared.source, mount: declared.posture });
        assert.equal(declared.rendersPanel, true);
        assert.deepEqual([...model.keystrokeSinks], []);
        assert.equal(model.sendPath, null);
        assert.equal(model.readOnlyLabel, "read-only");
        assert.equal(model.cursor.blink, false);
      },
    },
    {
      n: 8,
      claim: "the board's `mirror` mount is still `interactive`, still typeable, and still the SAME source row as the fleet's",
      check: async () => {
        const board = boardDockMount(boardSession);
        assert.equal(board.posture, POSTURE_INTERACTIVE);
        assert.equal(inputPolicyFor(board.source, board.posture).inputEnabled, true);
        assert.equal(board.source, fleetTerminalMount(fleetRow, { itemRef: "49/03" }).source);
      },
    },
    {
      n: 9,
      claim: "part 2's whole-table drive and its seven fail-closed rows still run",
      check: async () => {
        await run(laneNamed(/part 2 — the policy/));
      },
    },
    {
      n: 10,
      claim: "part 3's `ui/src/fleet/**` sweep still runs, still with a file floor, still finding zero offenders",
      check: async (source) => {
        const fleet = await readSurface("ui/src/fleet");
        assert.ok(fleet.length >= 5, `the floor is still there and still met: ${fleet.length}`);
        assert.deepEqual(inputSourceOffenders(fleet), []);
        assert.match(source, /fleetListing\.length >= 5/, "…and the floor is asserted in the gate itself");
      },
    },
    {
      n: 11,
      claim: "the six control-side clauses of part 3 still run",
      check: async () => {
        await run(laneNamed(/part 3 — the surviving sweep/));
      },
    },
    {
      n: 12,
      claim: "invariants 1, 2 and 3 still run and still fire on their plants",
      check: async () => {
        await run(laneNamed(/route's input seam EXISTS|worker's input handler delivers EXCLUSIVELY|bridge \+ mirror write NO durable record/));
      },
    },
  ].map((example) => ({
    name: `49/03 task02 — STRICTLY STRONGER, surviving assertion ${example.n}: ${example.claim}`,
    run: async () => {
      await example.check(await gateSource());
    },
  })),

  // ══ …AND THESE ARE THE ADDITIONS. 8 rows. ════════════════════════════════════════════════
  ...[
    {
      n: 1,
      claim: "`ui/src/board/**` has exactly one posture author, and it is `dock-mount.mjs`",
      check: async () => {
        const writers = (await readSurface("ui/src/board")).filter((file) => /(^|[\s{,(])posture\s*:/m.test(file.source)).map((file) => file.path);
        // ONE AUTHOR, spelled as the floor plus a declared ceiling — never as a one-member census
        // (FF-11902): the module is named AMONG what the sweep of ui/src/board found.
        assert.ok(writers.length >= 1, "the sweep of ui/src/board found no posture author");
        assert.ok(writers.length <= 1, `ui/src/board has exactly one posture author — found: ${writers.join(", ")}`);
        assert.equal(writers[0], "ui/src/board/dock-mount.mjs", "…and it is dock-mount.mjs");
      },
    },
    {
      n: 2,
      claim: "`ui/src/home/**` has exactly one posture author, and it is `session-mount.mjs`",
      check: async () => {
        const writers = (await readSurface("ui/src/home")).filter((file) => /(^|[\s{,(])posture\s*:/m.test(file.source)).map((file) => file.path);
        // ONE AUTHOR, spelled as the floor plus a declared ceiling — never as a one-member census
        // (FF-11902): the module is named AMONG what the sweep of ui/src/home found.
        assert.ok(writers.length >= 1, "the sweep of ui/src/home found no posture author");
        assert.ok(writers.length <= 1, `ui/src/home has exactly one posture author — found: ${writers.join(", ")}`);
        assert.equal(writers[0], "ui/src/home/session-mount.mjs", "…and it is session-mount.mjs");
      },
    },
    {
      n: 3,
      claim: "the board's JSX mount site is checked for the bare call, per surface, with a floor of one",
      check: async () => {
        const board = await readSurface("ui/src/board");
        const fired = mountSiteOffenders(board.filter((file) => !/<\s*TerminalControl/.test(file.source)), POSTURE_HOMES.filter((entry) => entry.dir === "ui/src/board"));
        assert.ok(fired.some((offender) => /the board dock/.test(offender)), "a board with no mount site fails its OWN floor");
      },
    },
    {
      n: 4,
      claim: "the home's JSX mount site is checked the same way, discovered by sweep rather than named",
      check: async (source) => {
        assert.ok(!/home\/[A-Za-z]+\.tsx/.test(source.slice(source.indexOf("export const POSTURE_HOMES"), source.indexOf("const MOUNT_PROP"))), "the table names no home COMPONENT file — only the directory and the module");
        const home = await readSurface("ui/src/home");
        const sites = home.filter((file) => /<\s*TerminalControl/.test(file.source)).map((file) => file.path);
        assert.ok(sites.length >= 1, `the site is DISCOVERED by sweeping the directory: ${sites.join(", ")}`);
      },
    },
    {
      n: 5,
      claim: "the home's REAL mount is driven with adversarial rows and must fail closed to `read-only`",
      check: async () => {
        for (const decoy of [{ posture: "interactive" }, { readOnly: false }, { canInput: true }]) {
          assert.equal(homeSessionMount(homeRow(decoy), { axis: FEED_NO_PRODUCER }).posture, POSTURE_READ_ONLY);
        }
      },
    },
    {
      n: 6,
      claim: "the home's REAL mount must yield `interactive` for a positively-established `producer-known` row",
      check: async () => {
        assert.equal(homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN }).posture, POSTURE_INTERACTIVE);
      },
    },
    {
      n: 7,
      claim: "`ui/src/home/**` is swept for input sources and browser sockets",
      check: async () => {
        const home = await readSurface("ui/src/home");
        assert.deepEqual(inputSourceOffenders(home), []);
        assert.ok(inputSourceOffenders([...home, { path: "ui/src/home/x.mjs", source: "term.onData((b) => b);" }]).length >= 1);
      },
    },
    {
      n: 8,
      claim: "the contrast clause now proves three postures across three surfaces rather than two across two",
      check: async () => {
        const surfaces = new Set([
          `fleet:${fleetTerminalMount(fleetRow, { itemRef: "49/03" }).posture}`,
          `board:${boardDockMount(boardSession).posture}`,
          `home:${homeSessionMount(producerRow(), { axis: FEED_PRODUCER_KNOWN }).posture}`,
          `home:${homeSessionMount(homeRow()).posture}`,
        ]);
        assert.equal(surfaces.size, 4, `three surfaces, four answers, two postures: ${[...surfaces].join(" · ")}`);
      },
    },
  ].map((example) => ({
    name: `49/03 task02 — AND THESE ARE THE ADDITIONS, addition ${example.n}: ${example.claim}`,
    run: async () => {
      await example.check(await gateSource());
    },
  })),

  {
    name: "49/03 task02 — and NOTHING IS EXEMPTED anywhere: no file, directory or clause is added to a skip list in this diff",
    run: async () => {
      const source = await gateSource();
      for (const shape of [/\bEXEMPT\w*\s*=/, /\bALLOW(?:ED|LIST)\w*\s*=/, /\bWHITELIST\w*\s*=/, /\bSKIP\w*\s*=/, /\bIGNORE(?:D|LIST)\w*\s*=/]) {
        assert.ok(!shape.test(source), `the gate holds no exemption list (${shape})`);
      }
      // The ONE path-scoped exclusion in the file is the `.d.mts` filter the sweep has always had
      // — a FILE-TYPE rule, not a permission for a file — and it is unchanged.
      assert.match(source, /!entry\.name\.endsWith\("\.d\.mts"\)/, "the `.d.mts` exclusion is the sweep's own file-type filter, unchanged");
      assert.equal((source.match(/\.d\.mts/g) ?? []).length, 2, "…and it appears exactly where it always did: in the filter and in its comment");
    },
  },
];
