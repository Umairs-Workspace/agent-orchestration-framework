// Traceability: milestone 61 / story 05 — the event a ruling raises.
//
//   tasks/00_a-ruling-raises-a-declared-event.feature
//   tasks/01_the-why-travels-with-the-change.feature
//   tasks/02_an-undeclared-event-name-is-refused.feature
//   tasks/03_redelivery-changes-nothing.feature
//
// Every scenario and every Examples row across the four is exercised here, through the
// REAL seam, the REAL journal and the REAL working tree — including `git`, because
// "reverting takes back both the change and the reason for it" is a claim about a
// repository and cannot be proved against a mock of one.
//
// THE RULING CARRIES THE DIGEST OBJECT, NOT A BARE STRING. `criterionDigest` returns
// per-member digests as well as the whole criterion's, and only the object form lets a
// reset name WHICH part moved; a ruling carrying only the string renders
// `member: "unknown"`. The obligation is 61/01's review's, re-confirmed at 61/04's, and
// what this story owes it is that the PERSISTED form round-trips it.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { spawnSyncHardened } from "../support/cli-spawn.mjs";
import { AOF_GITIGNORE_ENTRIES, ensureAofGitignore } from "../../src/aof-gitignore.mjs";
import {
  EFFECTS,
  EVENT_NOT_DECLARED,
  applicableReactors,
  effectsFor,
  knownEvents,
} from "../../src/effects/table.mjs";
import { openEffectsJournal, appendEvent, markStep, pendingSteps, readEventSteps, readEvents } from "../../src/effects/journal.mjs";
import { drainEffects } from "../../src/effects/dispatch.mjs";
import {
  HARNESS_DRAIN_NOT_OPTIONAL,
  HARNESS_RECORD_NOT_STAMPED,
  HARNESS_RULED,
  STAMP_EVIDENCE,
  transitionHarnessRuled,
} from "../../src/effects/harness-transitions.mjs";
import {
  LEDGER_LINE_CONFLICT,
  LEDGER_LINE_KEY,
  PROJECT_DIR_UNSET,
  STORE_REFUSALS,
  appendRuling,
  ledgerPath,
  readLedger,
  setKnobValue,
} from "../../src/work-acceptor/store.mjs";
import { LEDGER_RELPATH, criterionDigest, defaultCriterion } from "../../src/work-acceptor/criterion.mjs";
import { PAIR_OUTCOMES, deriveRule } from "../../src/work-acceptor/rule.mjs";

// One derivation of the repo root, not one per leg. Two legs below each spelled their own
// hand-rolled URL-to-path conversion, and when 119/03 moved this suite into test/grade/ both went
// stale at once — the same hop-count they had both written down by hand.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
import { RULING_INCOMPLETE, RULING_KEYS, accrue, attained } from "../../src/work-acceptor/ledger.mjs";

const shipped = defaultCriterion();
const rule = deriveRule(shipped);
const digest = criterionDigest(shipped);

const W = PAIR_OUTCOMES.FAVOURABLE;
const L = PAIR_OUTCOMES.UNFAVOURABLE;
const T = PAIR_OUTCOMES.TIE;

// The knob a ruling in these fixtures moves. Spelled in the TEST, never in an acceptor
// module: the tunable set is the registry's `parameter-tuning:` edge, and a key held in
// `src/work-acceptor/` would be a second home for it (FF-6110).
const KNOB = "work.loop.reviewRounds";

// A CO-AUTHORED configuration: keys an operator chose, in an order they chose, with
// formatting they chose — a compact array on one line, a nested section, a sibling on
// either side of the one a ruling moves. Every byte of it that is not the knob's own value
// is what "surgical" has to preserve.
const CONFIG_TEXT = [
  "{",
  '  "$schema": "https://aof.local/schemas/aof.schema.json",',
  '  "name": "fixture",',
  '  "work": {',
  '    "dir": "./wiki/work",',
  '    "tags": { "layers": ["@cli", "@ui"] },',
  '    "loop": {',
  '      "reviewRounds": 1,',
  '      "buildNoProgressRounds": 2',
  "    },",
  '    "autonomous": { "maxAttempts": 3 }',
  "  },",
  '  "memory": { "backend": "local" }',
  "}",
  "",
].join("\n");

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────

const fixtures = [];

async function workspace({ config = CONFIG_TEXT, ledger = null, git = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-harness-ruled-"));
  const globalHome = await mkdtemp(path.join(os.tmpdir(), "aof-harness-gh-"));
  fixtures.push(root, globalHome);
  await mkdir(path.join(root, ".aof"), { recursive: true });
  if (config != null) await writeFile(path.join(root, ".aof", "aof.config.json"), config, "utf8");
  if (ledger != null) await writeFile(ledgerPath(root), ledger, "utf8");
  const env = { ...process.env, AOF_GLOBAL_HOME: globalHome };
  const context = {
    root,
    globalHome,
    journalOptions: { env },
    configPath: path.join(root, ".aof", "aof.config.json"),
    ledgerFile: ledgerPath(root),
    git: (...args) => spawnSyncHardened("git", ["-C", root, ...args], { encoding: "utf8", shell: false }),
  };
  if (git) {
    context.git("init", "-q");
    context.git("config", "user.email", "fixture@aof.local");
    context.git("config", "user.name", "aof fixture");
    context.git("config", "commit.gpgsign", "false");
    context.git("config", "core.autocrlf", "false");
    context.git("add", "-A");
    context.git("commit", "-q", "-m", "baseline");
  }
  return context;
}

async function cleanup() {
  for (const dir of fixtures.splice(0)) await rm(dir, { recursive: true, force: true });
}

async function withFixtures(body) {
  try {
    return await body();
  } finally {
    await cleanup();
  }
}

// A COMPLETE ruling — all thirteen frozen keys, carrying the digest OBJECT.
function ruling(overrides = {}) {
  return {
    key: KNOB,
    from: 1,
    to: 2,
    epochId: "61",
    criterion: digest,
    ledger: [W],
    evalue: attained({ wins: 1, losses: 0 }, rule),
    counterMetric: { before: 0, after: 0, direction: "unchanged", measured: true },
    dwell: "cycles:2",
    dwellFrom: "61",
    provenance: "acceptor",
    verdict: "report-only",
    refusals: ["evidence-short"],
    ...overrides,
  };
}

const committing = (overrides = {}) => ruling({ verdict: "commit", refusals: [], ledger: [W, W, W, W, W, W, W, W], evalue: attained({ wins: 8, losses: 0 }, rule), ...overrides });

const journalFor = (context) => openEffectsJournal(context.journalOptions);

async function refusalOf(body) {
  try {
    await body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

// The status lines a repository reports, normalised and sorted.
const porcelain = (context) => context.git("status", "--porcelain").stdout.split("\n").map((line) => line.trim()).filter(Boolean).sort();

// ── FEATURE 00 · A ruling is a fact the system records, whether or not anything moved ──

const featureZero = [
  {
    name: "61/05 task 00 · rendering a ruling is what records it — the record is appended beside the configuration it concerns, and it is the one the acceptor rendered rather than one re-derived afterwards",
    run: () => withFixtures(async () => {
      const context = await workspace();
      // The ruling's OWN verdict is report-only while its evidence is eight favourable
      // pairs — a sequence that WOULD cross the level if anything downstream re-derived a
      // verdict from it. Nothing does, which is the property: the reactor writes what the
      // acceptor rendered.
      const rendered = ruling({ ledger: [W, W, W, W, W, W, W, W], evalue: attained({ wins: 8, losses: 0 }, rule) });
      assert.ok(rendered.evalue >= 1 / shipped.alpha, "the planted evidence really would cross if it were re-derived");

      const result = await transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: context.journalOptions });
      assert.equal(result.record.verdict, "report-only");

      const ledger = await readLedger(context.root);
      assert.equal(ledger.total, 1, "a record of it is appended");
      assert.equal(ledger.path, path.join(context.root, ".aof", "acceptor-ledger.jsonl"), "…beside the configuration it concerns, in the workspace's own tracked state");
      const [record] = ledger.records;
      assert.equal(record.verdict, "report-only", "the record is the one the acceptor rendered, not one re-derived from the evidence");
      assert.equal(record.evalue, rendered.evalue, "…including what it attained");
      assert.deepEqual(record.ledger, rendered.ledger, "…and the evidence it attained it on");
      assert.equal(record[LEDGER_LINE_KEY], result.rulingId, "and the record names the ruling that raised it");
    }),
  },
  {
    name: "61/05 task 00 · the ruling is recorded whatever it decided — all five Examples rows, report-only leaving the configuration unchanged and commit carrying the new value",
    run: () => withFixtures(async () => {
      // Report-only is the steady state, so the SILENT outcomes are the ones that must be
      // recorded: four of these five leave nothing else behind at all.
      const rows = [
        { ruling: "the evidence is short of the threshold", verdict: "report-only", refusals: ["evidence-short"], moves: false },
        { ruling: "nothing has been observed that could measure it", verdict: "report-only", refusals: ["metric-unmeasurable"], moves: false },
        { ruling: "nothing in the system consumes the value", verdict: "report-only", refusals: ["not-admissible"], moves: false },
        { ruling: "the trial costs more than the criterion can afford", verdict: "report-only", refusals: ["trial-unaffordable"], moves: false },
        { ruling: "the evidence is decisive and the change is taken", verdict: "commit", refusals: [], moves: true },
      ];
      for (const row of rows) {
        const context = await workspace();
        const rendered = row.moves ? committing() : ruling({ verdict: row.verdict, refusals: row.refusals });
        await transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: context.journalOptions });

        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 1, `${row.ruling}: a record of it is appended`);
        assert.equal(ledger.records[0].verdict, row.verdict, `${row.ruling}: its verdict reads ${row.verdict}`);
        assert.deepEqual(ledger.records[0].refusals, row.refusals, `${row.ruling}: and what refused it`);

        const config = await readFile(context.configPath, "utf8");
        if (row.moves) {
          assert.notEqual(config, CONFIG_TEXT, `${row.ruling}: the configuration it concerns carries the new value`);
          assert.equal(JSON.parse(config).work.loop.reviewRounds, 2, `${row.ruling}: …and that value is the one ruled for`);
        } else {
          assert.equal(config, CONFIG_TEXT, `${row.ruling}: the configuration it concerns is unchanged, byte for byte`);
        }
      }
    }),
  },
  {
    name: "61/05 task 00 · a ruling that moved nothing leaves the same kind of trace as one that did — the refusal is readable in the ledger and carries every field a committing ruling carries",
    run: () => withFixtures(async () => {
      const context = await workspace();
      await transitionHarnessRuled(ruling({ refusals: ["not-admissible", "metric-unmeasurable"] }), { projectDir: context.root, journalOptions: context.journalOptions });
      const refused = (await readLedger(context.root)).records[0];

      const committed = await workspace();
      await transitionHarnessRuled(committing(), { projectDir: committed.root, journalOptions: committed.journalOptions });
      const taken = (await readLedger(committed.root)).records[0];

      assert.deepEqual(refused.refusals, ["not-admissible", "metric-unmeasurable"], "the refusal is readable there");
      assert.deepEqual(
        Object.keys(refused).filter((key) => key !== LEDGER_LINE_KEY),
        [...RULING_KEYS],
        "it carries the same fields a committing ruling carries",
      );
      assert.deepEqual(Object.keys(refused), Object.keys(taken), "…field for field, in the same order");
    }),
  },
  {
    name: "61/05 task 00 · the record is the only thing a report-only ruling writes — one working-tree change, and no harness value written",
    run: () => withFixtures(async () => {
      const context = await workspace({ git: true });
      const before = await readFile(context.configPath, "utf8");
      await transitionHarnessRuled(ruling(), { projectDir: context.root, journalOptions: context.journalOptions });

      assert.deepEqual(porcelain(context), ["?? .aof/acceptor-ledger.jsonl"], "the appended record is the only change to the working tree");
      assert.equal(await readFile(context.configPath, "utf8"), before, "and no harness value was written");
    }),
  },
  {
    name: "61/05 task 00 · a committing ruling and its record are ONE change — reverting that one change takes back both",
    run: () => withFixtures(async () => {
      const context = await workspace({ git: true });
      const baseline = await readFile(context.configPath, "utf8");
      await transitionHarnessRuled(committing(), { projectDir: context.root, journalOptions: context.journalOptions });

      assert.deepEqual(
        porcelain(context),
        ["?? .aof/acceptor-ledger.jsonl", "M .aof/aof.config.json"],
        "the new value and the record that justifies it are one working-tree change",
      );

      context.git("add", "-A");
      context.git("commit", "-q", "-m", "a ruling");
      assert.equal(JSON.parse(await readFile(context.configPath, "utf8")).work.loop.reviewRounds, 2, "the change landed");

      const reverted = context.git("revert", "--no-edit", "HEAD");
      assert.equal(reverted.status, 0, `one revert: ${reverted.stderr}`);
      assert.equal(await readFile(context.configPath, "utf8"), baseline, "reverting that one change takes back the harness value");
      await assert.rejects(() => stat(context.ledgerFile), "…and the record that justified it, in the same revert");
    }),
  },
  {
    name: "61/05 task 00 · the record is kept, not regenerated — a workspace prepared by aof tracks the ledger rather than ignoring it",
    run: () => withFixtures(async () => {
      const context = await workspace({ git: true });
      // The workspace as `aof` prepares one: the derived/regenerable baseline written into
      // `.aof/.gitignore` by the module that owns it.
      assert.equal(await ensureAofGitignore(context.root), true, "the aof baseline was established");
      await transitionHarnessRuled(ruling(), { projectDir: context.root, journalOptions: context.journalOptions });

      // Asking the REPOSITORY, not a list: `check-ignore` exits 0 when a path is ignored.
      const asked = context.git("check-ignore", "--no-index", LEDGER_RELPATH);
      assert.equal(asked.status, 1, `it is tracked rather than ignored (git check-ignore said: ${asked.stdout.trim() || "nothing"})`);
      assert.ok(porcelain(context).includes("?? .aof/acceptor-ledger.jsonl"), "…and the repository sees it as a file it may track");

      // …and it is not treated as a derived artifact that may be rebuilt from something
      // else. That register is `AOF_GITIGNORE_ENTRIES`, whose whole subject is "derived and
      // regenerable"; the ledger is neither, so it is absent by path AND by basename.
      assert.equal(AOF_GITIGNORE_ENTRIES.includes(LEDGER_RELPATH), false, "the ledger path is absent from the derived-artifact register");
      assert.equal(AOF_GITIGNORE_ENTRIES.includes(path.posix.basename(LEDGER_RELPATH)), false, "…and so is its basename, which is the form that register actually uses");
      // Re-running the baseline is a no-op over it: a derived artifact would have been
      // added to the ignore file by this very call.
      assert.equal(await ensureAofGitignore(context.root), false, "the baseline is idempotent and never grows to cover the ledger");
    }),
  },
  {
    name: "61/05 task 00 · a refused harness write announces nothing — no record is appended and no consequence is left owed",
    run: () => withFixtures(async () => {
      // A committing ruling whose harness value cannot be written: the configuration this
      // workspace would have to move does not exist.
      const context = await workspace({ config: null });
      const refusal = await refusalOf(() => transitionHarnessRuled(committing(), { projectDir: context.root, journalOptions: context.journalOptions }));
      assert.equal(refusal.code, "ENOENT", `the write was refused (${refusal.code})`);

      const ledger = await readLedger(context.root);
      assert.equal(ledger.total, 0, "no record is appended");
      assert.equal(ledger.read, true, "…and that zero is a ledger that was read, not one that could not be");

      const journal = await journalFor(context);
      try {
        assert.deepEqual(readEvents(journal, { name: HARNESS_RULED }), [], "nothing was announced");
        assert.deepEqual(pendingSteps(journal), [], "and no consequence is left owed");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 00 · a consequence that cannot be discharged yet stays owed — the record appears when the outstanding consequences are next worked through, exactly once",
    run: () => withFixtures(async () => {
      const context = await workspace();
      // The record cannot be written: the ledger's own path is occupied by a directory.
      await mkdir(context.ledgerFile, { recursive: true });

      const refusal = await refusalOf(() => transitionHarnessRuled(ruling(), { projectDir: context.root, journalOptions: context.journalOptions }));
      assert.equal(refusal.code, HARNESS_RECORD_NOT_STAMPED, "the seam reports the undischarged record rather than returning success");
      assert.ok(refusal.eventId, "…naming the event whose consequence is still owed");

      const journal = await journalFor(context);
      try {
        const owed = pendingSteps(journal, { eventId: refusal.eventId });
        assert.equal(owed.length, 1, "the consequence is journaled and still owed");
        assert.equal(owed[0].key, STAMP_EVIDENCE);

        // The obstruction clears, and the next pass through the outstanding consequences
        // pays it — any process, any face.
        await rm(context.ledgerFile, { recursive: true, force: true });
        const outcomes = await drainEffects({ journal, eventId: refusal.eventId });
        assert.deepEqual(outcomes.map((outcome) => outcome.status), ["done"], `the record appears (${JSON.stringify(outcomes)})`);
        assert.equal((await readLedger(context.root)).total, 1, "…and it appears exactly once");

        // …and a further pass adds nothing, because the step is settled and the append is
        // idempotent besides.
        await drainEffects({ journal, eventId: refusal.eventId });
        assert.equal((await readLedger(context.root)).total, 1, "still exactly once");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 00 · nothing else writes into the ledger — a harness value edited directly rather than ruled on adds no record and leaves the acceptor's evidence unchanged",
    run: () => withFixtures(async () => {
      const context = await workspace();
      await transitionHarnessRuled(ruling(), { projectDir: context.root, journalOptions: context.journalOptions });
      const before = await readLedger(context.root);
      const evidenceBefore = accrue({ rulings: before.records, rule });

      // An edit that went round the acceptor entirely — an operator, a script, a merge.
      await writeFile(context.configPath, setKnobValue(CONFIG_TEXT, KNOB, 3), "utf8");
      assert.equal(JSON.parse(await readFile(context.configPath, "utf8")).work.loop.reviewRounds, 3, "the direct edit really landed");

      const after = await readLedger(context.root);
      assert.equal(after.text, before.text, "no record was added by that edit");
      assert.equal(after.total, 1);
      const evidenceAfter = accrue({ rulings: after.records, rule });
      assert.equal(evidenceAfter.total, evidenceBefore.total, "and the acceptor's evidence is unchanged by it");
      assert.deepEqual(evidenceAfter.sequence, evidenceBefore.sequence);
      assert.equal(evidenceAfter.evaluation?.wealth, evidenceBefore.evaluation?.wealth);
    }),
  },
  {
    name: "61/05 task 00 · the events already declared are untouched — each owes the consequences it owed before, and none of them appends a ruling record",
    run: async () => {
      // The eight, pinned as a census rather than a count: what each was owed before this
      // story, key and locus, in cascade order.
      const BEFORE = Object.freeze({
        "run.started": [["advance-status", "checkout"], ["publish-projection", "local"]],
        "run.completed": [["rollback-status", "checkout"], ["publish-projection", "local"], ["notion-status-sync", "integration:notion"]],
        "feedback.recorded": [["publish-projection", "local"]],
        "item-status.changed": [["publish-projection", "local"], ["notion-status-sync", "integration:notion"]],
        "stream.reindexed": [
          ["remap-run-refs", "checkout"],
          ["remap-notion-map", "checkout"],
          ["remap-projection", "local"],
          ["remap-control-facts", "control-store"],
          ["publish-projection", "local"],
        ],
        "assignment.reported": [["settle-assignment", "control-store"]],
        "terminal.resume-refused": [["restore-parked-resume", "control-store"]],
        "assignment.settled": [["record-item-branch", "control-store"]],
      });

      for (const [name, owed] of Object.entries(BEFORE)) {
        assert.deepEqual(
          EFFECTS[name].map((reactor) => [reactor.key, reactor.locus]),
          owed,
          `${name}: the consequences it owes are the ones it owed before`,
        );
        assert.equal(
          EFFECTS[name].some((reactor) => reactor.key === STAMP_EVIDENCE),
          false,
          `${name}: none of them appends a ruling record`,
        );
      }
      // …and exactly one name joined them.
      assert.deepEqual(knownEvents(), [...Object.keys(BEFORE), HARNESS_RULED], "one name was added, in one place, and no other moved");
    },
  },
];

// ── FEATURE 01 · The record answers, six months later, why the harness is the way it is ──

// The twelve things a reader who was not there has to be able to read off the page, each
// paired with the frozen key(s) it is carried by, and with the question a blank would
// silently answer wrong.
//
// "when it may be reverted" is TWO keys, and deliberately not a computed expiry: nothing
// in this system counts a cycle of the receiving loop, so converting the dwell declaration
// into a date would be a fabricated conversion (ADR-010 §5). The record holds the
// declaration as read and the epoch it started at; there is no `dwellExpiry` to drop.
const TWELVE = Object.freeze([
  ["the harness value it ruled on", ["key"], "which knob was this about"],
  ["the value held before", ["from"], "what would a revert restore"],
  ["the value ruled for", ["to"], "what did it become"],
  ["the epoch it was rendered in", ["epochId"], "when, in the system's own boundaries"],
  ["the rule in force", ["criterion"], "against which criterion, unchanged since when"],
  ["the evidence in the order it came", ["ledger"], "on what, and did the order flatter it"],
  ["how decisive the evidence was", ["evalue"], "was this close or was it settled"],
  ["the counter-metric reading", ["counterMetric"], "did anything get worse while this got better"],
  ["when it may be reverted", ["dwell", "dwellFrom"], "is it too soon to undo this"],
  ["who rendered it", ["provenance"], "whom do I ask about it"],
  ["the verdict", ["verdict"], "what was actually decided"],
  ["the refusals that applied", ["refusals"], "why it was not taken"],
]);

const featureOne = [
  {
    name: "61/05 task 01 · the complete record needs no other source to be understood — the value, both sides of the change, the epoch, the rule, the evidence in order, how decisive, the counter-metric, when it may be reverted and who rendered it",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const rendered = ruling({ ledger: [W, T, L, W], evalue: attained({ wins: 2, losses: 1 }, rule) });
      await transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: context.journalOptions });

      // An operator reading THAT RECORD ALONE — one line of one file, parsed, nothing else
      // opened.
      const [line] = (await readLedger(context.root)).lines;
      const record = JSON.parse(line);

      assert.equal(record.key, KNOB, "it names the harness value ruled on");
      assert.equal(record.from, 1, "…what it held before");
      assert.equal(record.to, 2, "…and what it became");
      assert.equal(record.epochId, "61", "it names the epoch");
      assert.equal(record.criterion.digest, digest.digest, "…the rule in force");
      assert.deepEqual(record.criterion.members, { ...digest.members }, "…in the per-member form that can say WHICH part moved, not a bare digest");
      assert.deepEqual(record.ledger, [W, T, L, W], "…the evidence in order");
      assert.equal(record.evalue, rendered.evalue, "…and how decisive it was");
      assert.deepEqual(record.counterMetric, rendered.counterMetric, "it names the counter-metric reading");
      assert.equal(record.dwell, "cycles:2", "…when it may be reverted, as the declaration that was read");
      assert.equal(record.dwellFrom, "61", "…paired with the epoch that dwell started at");
      assert.equal(record.provenance, "acceptor", "…and who rendered it");
      assert.equal(record.verdict, "report-only");
      assert.deepEqual(record.refusals, ["evidence-short"]);

      // Nothing about the decision has to be reconstructed from elsewhere: every frozen
      // key is present on the line, and no key is a pointer at another document.
      for (const part of RULING_KEYS) assert.ok(Object.hasOwn(record, part), `${part} is on the record itself`);
      assert.equal(Object.hasOwn(record, "dwellExpiry"), false, "and no expiry was fabricated out of a cycle count");
    }),
  },
  {
    name: "61/05 task 01 · a record missing any one of its fields is refused rather than written blank — all twelve Examples rows, each naming the field and appending nothing",
    run: () => withFixtures(async () => {
      for (const [field, parts, question] of TWELVE) {
        for (const part of parts) {
          const context = await workspace();
          const incomplete = ruling();
          delete incomplete[part];

          const refusal = await refusalOf(() => appendRuling(context.root, { rulingId: "r-1", ruling: incomplete }));
          assert.equal(refusal.code, RULING_INCOMPLETE, `${field}: it is refused`);
          assert.equal(refusal.part, part, `${field}: …naming ${field}`);
          assert.ok(refusal.message.includes(part), `${field}: the refusal names the missing part in words too`);

          const ledger = await readLedger(context.root);
          assert.equal(ledger.total, 0, `${field}: nothing is appended`);
          assert.equal(ledger.exists, false, `${field}: no record lands that answers "${question}" with a blank`);
        }
      }
    }),
  },
  {
    name: "61/05 task 01 · a measurement of zero is a reading and an absent measurement is a refusal — all six Examples rows",
    run: () => withFixtures(async () => {
      const rows = [
        { carried: "a counter-metric reading of zero", ruling: ruling({ counterMetric: 0 }), outcome: "appended" },
        { carried: "no counter-metric reading at all", ruling: ruling({ counterMetric: undefined }), outcome: "refused" },
        { carried: "an evidence sequence that is empty so far", ruling: ruling({ ledger: [], evalue: 1 }), outcome: "appended" },
        { carried: "no evidence sequence at all", ruling: ruling({ ledger: undefined }), outcome: "refused" },
        { carried: "an empty list of refusals on a committing ruling", ruling: committing({ refusals: [] }), outcome: "appended" },
        { carried: "no list of refusals at all", ruling: committing({ refusals: undefined }), outcome: "refused" },
      ];
      for (const row of rows) {
        const context = await workspace();
        if (row.outcome === "appended") {
          const result = await appendRuling(context.root, { rulingId: "r-1", ruling: row.ruling });
          assert.equal(result.appended, true, `${row.carried}: it is appended`);
          assert.equal((await readLedger(context.root)).total, 1, `${row.carried}: …and it is readable`);
        } else {
          const refusal = await refusalOf(() => appendRuling(context.root, { rulingId: "r-1", ruling: row.ruling }));
          assert.equal(refusal.code, RULING_INCOMPLETE, `${row.carried}: it is refused`);
          assert.equal((await readLedger(context.root)).total, 0, `${row.carried}: …and nothing landed`);
        }
      }
    }),
  },
  {
    name: "61/05 task 01 · the evidence keeps the order it arrived in — not sorted, not grouped, not reduced to totals, and the same outcomes in a different order read as a different record",
    run: () => withFixtures(async () => {
      const arrived = [L, W, T, W, L, W];
      const context = await workspace();
      await transitionHarnessRuled(ruling({ ledger: arrived }), { projectDir: context.root, journalOptions: context.journalOptions });
      const read = (await readLedger(context.root)).records[0];

      assert.deepEqual(read.ledger, arrived, "the sequence is the one that arrived");
      assert.notDeepEqual(read.ledger, [...arrived].sort(), "it has not been sorted");
      assert.equal(Array.isArray(read.ledger), true, "nor grouped or reduced to totals — it is still the sequence");

      // The same outcomes in a different order are a different record, and the ledger says
      // so at the level of the bytes it stores.
      const shuffled = [W, W, W, L, L, T];
      assert.deepEqual([...shuffled].sort(), [...arrived].sort(), "the plant really is the same multiset");
      const other = await workspace();
      await transitionHarnessRuled(ruling({ ledger: shuffled }), { projectDir: other.root, journalOptions: other.journalOptions, rulingId: "same-id" });
      const mine = await workspace();
      await transitionHarnessRuled(ruling({ ledger: arrived }), { projectDir: mine.root, journalOptions: mine.journalOptions, rulingId: "same-id" });
      assert.notEqual((await readLedger(other.root)).lines[0], (await readLedger(mine.root)).lines[0], "the same outcomes in a different order read as a different record");
    }),
  },
  {
    name: "61/05 task 01 · a record that was complete when rendered and lost a field before it landed is still refused, and nothing is appended",
    run: () => withFixtures(async () => {
      const context = await workspace();
      // Complete at the moment it was rendered…
      const rendered = ruling();
      assert.equal(RULING_KEYS.every((part) => rendered[part] !== undefined), true, "the record really was complete when rendered");
      // …and a field is lost on the way in — a transport, a serialisation, a payload
      // assembled by hand. The ledger's own refusal is the second one for exactly this.
      const arrived = JSON.parse(JSON.stringify(rendered));
      delete arrived.counterMetric;

      const refusal = await refusalOf(() => appendRuling(context.root, { rulingId: "r-1", ruling: arrived }));
      assert.equal(refusal.code, RULING_INCOMPLETE, "it is refused");
      assert.equal(refusal.part, "counterMetric");
      assert.equal((await readLedger(context.root)).total, 0, "and nothing is appended");
    }),
  },
  {
    name: "61/05 task 01 · an operator can revert from the record alone — the value to restore is named on it, and the change and its record come back together in one revert",
    run: () => withFixtures(async () => {
      const context = await workspace({ git: true });
      const baseline = await readFile(context.configPath, "utf8");
      await transitionHarnessRuled(committing(), { projectDir: context.root, journalOptions: context.journalOptions });
      context.git("add", "-A");
      context.git("commit", "-q", "-m", "a ruling");

      // What the operator reads: one line, no other source.
      const record = JSON.parse((await readLedger(context.root)).lines[0]);
      assert.equal(record.key, KNOB, "the record names the value");
      assert.equal(record.from, 1, "the value to restore is named on the record");
      assert.equal(record.to, JSON.parse(await readFile(context.configPath, "utf8")).work.loop.reviewRounds, "…against what it actually became");

      const reverted = context.git("revert", "--no-edit", "HEAD");
      assert.equal(reverted.status, 0, `one revert: ${reverted.stderr}`);
      assert.equal(JSON.parse(await readFile(context.configPath, "utf8")).work.loop.reviewRounds, record.from, "the change comes back to the value the record named");
      assert.equal(await readFile(context.configPath, "utf8"), baseline);
      await assert.rejects(() => stat(context.ledgerFile), "…and its record comes back with it, in the same revert");
    }),
  },
  {
    name: "61/05 task 01 · an earlier record is never rewritten by a later one — the first is byte-identical to how it was written, and both are readable oldest first",
    run: () => withFixtures(async () => {
      const context = await workspace();
      await transitionHarnessRuled(ruling({ from: 1, to: 2, ledger: [W] }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "first" });
      const asWritten = (await readLedger(context.root)).lines[0];

      await transitionHarnessRuled(ruling({ from: 2, to: 3, ledger: [W, L] }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "second" });
      const after = await readLedger(context.root);

      assert.equal(after.lines[0], asWritten, "the earlier record is byte-identical to how it was written");
      assert.equal(after.total, 2, "and both are readable");
      assert.deepEqual(after.records.map((record) => record[LEDGER_LINE_KEY]), ["first", "second"], "…oldest first");
      assert.deepEqual(after.records.map((record) => record.to), [2, 3]);
    }),
  },
];

// ── FEATURE 02 · A name the vocabulary does not declare is refused ────────────────────

// A vocabulary a past version declared and this one does not — supplied as the TABLE,
// which is what makes the refusal a property of the table a name is offered to rather than
// of one hard-coded set.
const RETIRED = "assignment.parked";
const PAST_VERSION = Object.freeze({ [RETIRED]: Object.freeze([Object.freeze({ key: "settle", locus: "local", apply: async () => ({}) })]) });

const featureTwo = [
  {
    name: "61/05 task 02 · the misspelling that motivated this is refused — as undeclared, naming the name it was given, and nothing is recorded under it",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const misspelt = "harness.ruleed";
      assert.equal(knownEvents().includes(misspelt), false, "the plant really is undeclared");

      const refusal = await refusalOf(() => applicableReactors(misspelt, { workspaceRoot: context.root }));
      assert.equal(refusal.code, EVENT_NOT_DECLARED, "it is refused as undeclared");
      assert.equal(refusal.event, misspelt, "the refusal names the name it was given");
      assert.ok(refusal.message.includes(misspelt), "…in words as well as in a field");

      const journal = await journalFor(context);
      try {
        assert.deepEqual(readEvents(journal, { name: misspelt }), [], "nothing is recorded under that name");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 02 · a refusal leaves nothing behind — no event stored, no consequence owed to anyone",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const journal = await journalFor(context);
      try {
        await refusalOf(() => applicableReactors("harness.rules", { workspaceRoot: context.root }));
        assert.deepEqual(readEvents(journal, { limit: 50 }), [], "no event was stored");
        assert.deepEqual(pendingSteps(journal), [], "and no consequence is left owed to anyone");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 02 · an undeclared name is told apart from a declared one with nothing to do — the second resolves to no consequence, is not refused, and is recorded as it always was",
    run: () => withFixtures(async () => {
      const context = await workspace();
      // A declared event none of whose consequences apply to THIS workspace — the shape a
      // workspace with no external integration configured genuinely has.
      const table = Object.freeze({
        "integration.happened": Object.freeze([
          Object.freeze({ key: "sync", locus: "integration:elsewhere", apply: async () => ({}), applies: async () => false }),
        ]),
      });
      const owed = await applicableReactors("integration.happened", { workspaceRoot: context.root }, {}, table);
      assert.deepEqual(owed, [], "it resolves to no consequence");
      // …and it is NOT refused: reaching this line at all is the assertion.

      const journal = await journalFor(context);
      try {
        const { eventId } = appendEvent(journal, { name: "integration.happened", payload: { workspaceRoot: context.root }, source: "test" }, owed);
        const stored = readEvents(journal, { name: "integration.happened" });
        assert.equal(stored.length, 1, "the event is recorded as it always was");
        assert.deepEqual(stored[0].payload, { workspaceRoot: context.root }, "…carrying its own evidence");
        assert.deepEqual(readEventSteps(journal, eventId), [], "with nothing owed for it");

        // And the same question asked of an UNDECLARED name is a different answer.
        const refusal = await refusalOf(() => applicableReactors("integration.happenedd", {}, {}, table));
        assert.equal(refusal.code, EVENT_NOT_DECLARED, "'no consequence applies here' and 'nobody knows that name' are different answers");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 02 · the names a seam may raise and the ones it may not — all eight Examples rows",
    run: async () => {
      const declared = "feedback.recorded";
      // Every near-miss is DERIVED from a declared name rather than typed, so the row
      // still means "one letter wrong" the day the vocabulary changes.
      const rows = [
        { offered: "a name the vocabulary declares", name: declared, table: EFFECTS, owed: 1 },
        { offered: "the ruling name this story adds", name: HARNESS_RULED, table: EFFECTS, owed: 1 },
        { offered: "a declared name with one letter wrong", name: `${declared.slice(0, -1)}x`, table: EFFECTS, owed: null },
        { offered: "a declared name in the wrong case", name: declared.toUpperCase(), table: EFFECTS, owed: null },
        { offered: "a declared name with whitespace around it", name: ` ${declared} `, table: EFFECTS, owed: null },
        { offered: "a name a past version declared and no longer does", name: RETIRED, table: EFFECTS, owed: null },
        { offered: "a name that is the empty string", name: "", table: EFFECTS, owed: null },
        { offered: "a name that is not text at all", name: 42, table: EFFECTS, owed: null },
      ];

      // The retired name really WAS a name once — asserted against the past version's own
      // table, so the row is a vocabulary that moved rather than a name nobody ever used.
      assert.equal((await applicableReactors(RETIRED, {}, {}, PAST_VERSION)).length, 1, "the retired name resolved under the table that declared it");

      for (const row of rows) {
        if (row.owed != null) {
          const resolved = await applicableReactors(row.name, {}, {}, row.table);
          assert.equal(resolved.length, row.owed, `${row.offered}: its declared consequences are owed`);
        } else {
          const refusal = await refusalOf(() => applicableReactors(row.name, {}, {}, row.table));
          assert.equal(refusal.code, EVENT_NOT_DECLARED, `${row.offered}: it is refused as undeclared`);
        }
      }

      // The near-misses that are not near-misses at all: an inherited member of the
      // vocabulary's own prototype. A bare index test reads `toString` as a declaration and
      // hands back a function that is not a reactor list.
      for (const inherited of ["toString", "constructor", "hasOwnProperty"]) {
        const refusal = await refusalOf(() => applicableReactors(inherited, {}, {}, EFFECTS));
        assert.equal(refusal.code, EVENT_NOT_DECLARED, `${inherited}: an inherited member is not a declared name`);
        assert.equal(effectsFor(inherited), null, `${inherited}: nor does the other reader hand one back`);
      }
    },
  },
  {
    name: "61/05 task 02 · the refusal is coded rather than a message to read, and is distinguishable from a failure to store the event",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const refusal = await refusalOf(() => applicableReactors("harness.ruleed", {}));
      assert.equal(typeof refusal.code, "string", "it carries a code the caller can branch on");
      assert.equal(refusal.code, EVENT_NOT_DECLARED);

      // The storage faults it must NOT be confused with — read off the journal itself
      // rather than quoted from a document.
      const journal = await journalFor(context);
      try {
        const nameless = await refusalOf(async () => appendEvent(journal, { name: "", payload: {} }, []));
        assert.equal(nameless.code, "invalid-event", "a failure to store carries its own code");
        assert.notEqual(nameless.code, refusal.code, "and it is distinguishable from a name the vocabulary does not declare");

        appendEvent(journal, { eventId: "fixed", name: HARNESS_RULED, payload: { a: 1 } }, []);
        const conflict = await refusalOf(async () => appendEvent(journal, { eventId: "fixed", name: HARNESS_RULED, payload: { a: 2 } }, []));
        assert.equal(conflict.code, "event-id-conflict", "…as is the other storage fault");
        assert.notEqual(conflict.code, refusal.code);
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 task 02 · every seam already in service keeps working — each raises the name it has always raised, none is refused, and each is owed the consequences it was owed before",
    run: async () => {
      const seams = [
        "src/effects/run-transitions.mjs",
        "src/effects/item-transitions.mjs",
        "src/effects/doc-transitions.mjs",
        "src/effects/stream-transitions.mjs",
        "src/effects/assignment-transitions.mjs",
        "src/effects/reconcile.mjs",
        "src/effects/harness-transitions.mjs",
      ];

      const raised = new Set();
      for (const seam of seams) {
        const source = await readFile(path.join(repoRoot, seam), "utf8");
        for (const match of source.matchAll(/(?:applicableReactors|raise)\s*\(\s*"([^"]+)"/gu)) raised.add(match[1]);
        for (const match of source.matchAll(/(?:const|let)\s+name\s*=\s*"([^"]+)"/gu)) raised.add(match[1]);
        for (const match of source.matchAll(/export const HARNESS_RULED\s*=\s*"([^"]+)"/gu)) raised.add(match[1]);
      }
      assert.ok(raised.size >= 6, `the seams in service really were read: ${[...raised].sort().join(", ")}`);

      for (const name of raised) {
        assert.notEqual(effectsFor(name), null, `${name}: the seam that has always raised it still resolves`);
        const owed = await applicableReactors(name, {}, {});
        assert.deepEqual(
          owed.map((reactor) => reactor.key),
          EFFECTS[name].filter((reactor) => typeof reactor.applies !== "function").map((reactor) => reactor.key),
          `${name}: it is owed the consequences it was owed before`,
        );
      }
    },
  },
  {
    name: "61/05 task 02 · the refusal comes before anything is stored — the storage holds no event under that name and no partially owed consequence is left for a later pass",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const journal = await journalFor(context);
      try {
        // The seam's own sequence: resolve, THEN append. The resolution refuses, so the
        // append is never reached.
        const refusal = await refusalOf(async () => {
          const reactors = await applicableReactors("harness.ruleed", { workspaceRoot: context.root });
          appendEvent(journal, { name: "harness.ruleed", payload: {}, source: "test" }, reactors);
        });
        assert.equal(refusal.code, EVENT_NOT_DECLARED);
        assert.deepEqual(readEvents(journal, { limit: 50 }), [], "the storage holds no event under that name");
        assert.deepEqual(pendingSteps(journal), [], "and no partially owed consequence is left for a later pass to find");
      } finally {
        journal.close();
      }

      // …and it is STRUCTURAL, not a habit of this test: every seam resolves before it
      // appends, so there is no ordering in which a refused name could reach storage.
      for (const seam of ["src/effects/run-transitions.mjs", "src/effects/item-transitions.mjs", "src/effects/doc-transitions.mjs", "src/effects/stream-transitions.mjs", "src/effects/harness-transitions.mjs"]) {
        const source = await readFile(path.join(repoRoot, seam), "utf8");
        const resolves = source.indexOf("applicableReactors(");
        const appends = source.indexOf("appendEvent(", source.indexOf("await applicableReactors"));
        assert.ok(resolves >= 0 && appends > resolves, `${seam}: resolves the vocabulary before it appends`);
      }
    }),
  },
];

// ── FEATURE 03 · The same ruling delivered twice leaves one record ────────────────────

// A DELIVERY, as the transport actually performs one: the reactor handed the event it
// would be handed, with the ruling's identity on the payload. This is what a second
// process, a resumed drain and a bridge all reduce to.
const deliver = (root, rulingId, record) =>
  EFFECTS[HARNESS_RULED][0].apply({ eventId: rulingId, name: HARNESS_RULED, payload: { workspaceRoot: root, rulingId, ruling: record } });

const featureThree = [
  {
    name: "61/05 task 03 · a redelivered ruling does not append a second record — one record, and the ledger byte-identical to before the redelivery",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const record = ruling();
      await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" });
      const before = await readLedger(context.root);

      const again = await deliver(context.root, "r-1", record);
      assert.equal(again.appended, false, "the same ruling delivered again appends nothing");
      const after = await readLedger(context.root);
      assert.equal(after.total, 1, "the ledger still holds one record for it");
      assert.equal(after.text, before.text, "and the ledger is byte-identical to before the redelivery");
    }),
  },
  {
    name: "61/05 task 03 · redelivery cannot move the evidence — the evidence it accrues is unchanged and no proposal moves closer to its threshold",
    run: () => withFixtures(async () => {
      const context = await workspace();
      // An acceptor accruing evidence on a harness value: three rulings, seven pairs.
      const rendered = [
        ruling({ ledger: [W, W, W] }),
        ruling({ ledger: [W, T, W] }),
        ruling({ ledger: [W, L] }),
      ];
      for (const [index, record] of rendered.entries()) {
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: `r-${index}` });
      }
      const before = accrue({ rulings: (await readLedger(context.root)).records, rule });
      assert.ok(before.evaluation.pairs > 0, "the accrual is non-vacuous");

      await deliver(context.root, "r-1", rendered[1]);
      const after = accrue({ rulings: (await readLedger(context.root)).records, rule });

      assert.equal(after.total, before.total, "the evidence it accrues is unchanged");
      assert.deepEqual(after.sequence, before.sequence);
      assert.equal(after.evaluation.wealth, before.evaluation.wealth);
      assert.equal(after.evaluation.winsStillNeeded, before.evaluation.winsStillNeeded, "no proposal moves closer to its threshold because of the redelivery");
      assert.equal(after.evaluation.budgetRemaining, before.evaluation.budgetRemaining);
    }),
  },
  {
    name: "61/05 task 03 · at-least-once delivery in the shapes it actually takes — all six Examples rows, five redeliveries against the one that is genuinely new",
    run: () => withFixtures(async () => {
      // once
      {
        const context = await workspace();
        const record = ruling();
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r" });
        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 1, "once: one record");
        assert.equal(accrue({ rulings: ledger.records, rule }).total, 1, "once: one ruling");
      }
      // twice in the same pass
      {
        const context = await workspace();
        const record = ruling();
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r" });
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r" });
        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 1, "twice in the same pass: one record");
        assert.equal(accrue({ rulings: ledger.records, rule }).total, 1, "twice in the same pass: one ruling");
      }
      // again after the process stopped between recording and acting
      {
        const context = await workspace();
        const record = ruling();
        const { eventId } = await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r", drain: false });
        assert.equal((await readLedger(context.root)).total, 0, "the process stopped before acting");
        const journal = await journalFor(context);
        try {
          await drainEffects({ journal, eventId });
          await drainEffects({ journal, eventId });
        } finally {
          journal.close();
        }
        await deliver(context.root, "r", record);
        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 1, "again after the process stopped: one record");
        assert.equal(accrue({ rulings: ledger.records, rule }).total, 1, "again after the process stopped: one ruling");
      }
      // again from a second process working through the same fact
      {
        const context = await workspace();
        const record = ruling();
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r" });
        // A different process, its own journal handle, the same fact and the same tree.
        const other = await openEffectsJournal(context.journalOptions);
        try {
          await drainEffects({ journal: other, eventId: "r" });
        } finally {
          other.close();
        }
        await deliver(context.root, "r", record);
        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 1, "again from a second process: one record");
        assert.equal(accrue({ rulings: ledger.records, rule }).total, 1, "again from a second process: one ruling");
      }
      // again much later, with other rulings recorded in between
      {
        const context = await workspace();
        const first = ruling({ ledger: [W] });
        await transitionHarnessRuled(first, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-first" });
        await transitionHarnessRuled(ruling({ ledger: [W, L] }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-second" });
        await transitionHarnessRuled(ruling({ ledger: [T] }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-third" });
        await deliver(context.root, "r-first", first);
        const ledger = await readLedger(context.root);
        assert.equal(ledger.records.filter((entry) => entry[LEDGER_LINE_KEY] === "r-first").length, 1, "again much later: one record");
        assert.equal(ledger.total, 3, "…and the rulings in between are untouched");
        assert.deepEqual(ledger.records.map((entry) => entry[LEDGER_LINE_KEY]), ["r-first", "r-second", "r-third"]);
      }
      // as two separate rulings that happen to read identically
      {
        const context = await workspace();
        const record = ruling();
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-a" });
        await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-b" });
        const ledger = await readLedger(context.root);
        assert.equal(ledger.total, 2, "two separate rulings that read identically: two records");
        assert.equal(accrue({ rulings: ledger.records, rule }).total, 2, "…and two rulings");
        const [a, b] = ledger.records;
        const { [LEDGER_LINE_KEY]: _idA, ...contentsA } = a;
        const { [LEDGER_LINE_KEY]: _idB, ...contentsB } = b;
        assert.deepEqual(contentsA, contentsB, "the plant really is two rulings that read identically");
      }
    }),
  },
  {
    name: "61/05 task 03 · a second machine reproduces the line rather than adding one — the line it would write is identical to the one already there",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const record = ruling();
      await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" });
      const [onDisk] = (await readLedger(context.root)).lines;

      const second = await deliver(context.root, "r-1", record);
      assert.equal(second.appended, false, "it does not append");
      assert.equal(second.reason, "already-recorded");
      assert.equal((await readLedger(context.root)).lines.length, 1);

      // …and what it WOULD have written, in an empty tree, is that exact line — the whole
      // reason a second machine's copy can be settled by identity.
      const elsewhere = await workspace();
      const wouldWrite = await appendRuling(elsewhere.root, { rulingId: "r-1", ruling: record });
      assert.equal(wouldWrite.line, onDisk, "the line it would write is identical to the one already there");
    }),
  },
  {
    name: "61/05 task 03 · the same identity carrying different contents is refused as a conflict — the record already in the ledger is unchanged and neither version silently replaces the other",
    run: () => withFixtures(async () => {
      const context = await workspace();
      await transitionHarnessRuled(ruling({ to: 2 }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" });
      const before = await readLedger(context.root);

      const refusal = await refusalOf(() => appendRuling(context.root, { rulingId: "r-1", ruling: ruling({ to: 3 }) }));
      assert.equal(refusal.code, LEDGER_LINE_CONFLICT, "it is refused as a conflict");
      assert.equal(refusal.rulingId, "r-1", "…naming the identity two records claimed");

      const after = await readLedger(context.root);
      assert.equal(after.text, before.text, "the record already in the ledger is unchanged");
      assert.equal(after.records[0].to, 2, "and neither version silently replaces the other");
      assert.equal(after.total, 1, "…nor joins it");
    }),
  },
  {
    name: "61/05 task 03 · a redelivery is recognisable rather than inferred — each record names the ruling that raised it, and a reader tells them apart without comparing contents",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const record = ruling();
      // Two records whose CONTENTS are identical. Contents alone cannot tell a redelivery
      // from a second ruling; the identity on the record can, which is the point.
      await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-a" });
      await transitionHarnessRuled(record, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-b" });

      const ledger = await readLedger(context.root);
      assert.equal(ledger.total, 2);
      for (const entry of ledger.records) assert.equal(typeof entry[LEDGER_LINE_KEY], "string", "each names the ruling that raised it");
      const ids = ledger.records.map((entry) => entry[LEDGER_LINE_KEY]);
      assert.equal(new Set(ids).size, 2, "a reader can tell a redelivered ruling from a new one WITHOUT comparing their contents");

      const contents = ledger.records.map(({ [LEDGER_LINE_KEY]: _id, ...rest }) => JSON.stringify(rest));
      assert.equal(contents[0], contents[1], "…which is load-bearing precisely because the contents are identical");

      // And the redelivery of one of them still lands nowhere.
      await deliver(context.root, "r-a", record);
      assert.equal((await readLedger(context.root)).total, 2);
    }),
  },
  {
    name: "61/05 task 03 · rulings that follow a redelivery are unaffected — appended after the existing records, in the order the rulings were rendered",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const first = ruling({ ledger: [W] });
      await transitionHarnessRuled(first, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" });
      const second = ruling({ ledger: [W, W] });
      await transitionHarnessRuled(second, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-2" });
      // The latest record is delivered twice.
      await deliver(context.root, "r-2", second);
      assert.equal((await readLedger(context.root)).total, 2, "the redelivery changed nothing");

      await transitionHarnessRuled(ruling({ ledger: [L] }), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-3" });
      const ledger = await readLedger(context.root);
      assert.equal(ledger.total, 3, "a further ruling is appended after the existing records");
      assert.deepEqual(ledger.records.map((entry) => entry[LEDGER_LINE_KEY]), ["r-1", "r-2", "r-3"], "and the order of the ledger is the order the rulings were rendered in");
      assert.deepEqual(accrue({ rulings: ledger.records, rule }).sequence, [W, W, W, L], "…which is what the accrual reads");
    }),
  },
];

// ── THE INVARIANT ITSELF, GUARDED BY ROUTE ───────────────────────────────────────────
//
// Not a fifth feature. These are regression guards for the sentence in the seam's own
// header — it may not "return success with a harness value written and no ledger line" —
// which was PROSE, and which three routes walked straight through. All three were MEASURED
// at review, not inferred, and their common root was one class: a DECLINE was
// indistinguishable from a DISCHARGE, and a tree nobody named silently became a relative
// path. Each entry below plants one route by its shortest path; the last asks the whole
// question exhaustively, so a fourth route cannot open somewhere nobody thought to look.

const theInvariant = [
  {
    name: "61/05 invariant · ROUTE 1 (the seam's own documented default call shape) — a ruling with no project directory is refused with a CODE before anything happens, rather than writing the knob into whatever configuration sits under the current working directory",
    run: () => withFixtures(async () => {
      // Why this was the worst of the three: `projectDir` defaulted to
      // `workspace?.projectRoot ?? null`, `null` was coerced to `""`, and `path.join("",
      // ".aof/aof.config.json")` is a RELATIVE path — so the knob write landed in whatever
      // tree the process happened to be standing in (measured at review: `1 -> 2` in a
      // checkout nobody had named), while the payload's null root made the reactor decline
      // and the seam returned success. So the cwd here is a WORKSPACE-SHAPED tree: if the
      // refusal ever regresses, this fixture is what gets written, and it is checked.
      const cwd = await workspace();
      const previous = process.cwd();
      process.chdir(cwd.root);
      try {
        const shapes = [
          ["the documented default call shape", {}],
          ["a workspace that names no root", { workspace: { name: "unrooted" } }],
          ["an explicitly empty project directory", { projectDir: "" }],
          ["the default shape, journal in hand", { journalOptions: cwd.journalOptions }],
        ];
        for (const [shape, opts] of shapes) {
          const refusal = await refusalOf(() => transitionHarnessRuled(committing(), opts));
          assert.equal(refusal.code, PROJECT_DIR_UNSET, `${shape}: refused, and with the store's own code`);
          assert.ok(STORE_REFUSALS.includes(refusal.code), `${shape}: …a code from the declared vocabulary, so a caller can branch on it`);
          assert.notEqual(refusal.code, "ENOENT", `${shape}: …never an uncoded filesystem error standing in for the refusal`);
          assert.equal(await readFile(cwd.configPath, "utf8"), CONFIG_TEXT, `${shape}: the configuration under the cwd is byte-identical — no knob moved in a tree nobody named`);
          assert.equal((await readLedger(cwd.root)).total, 0, `${shape}: and no record landed there either`);
        }
      } finally {
        process.chdir(previous);
      }

      // …and nothing was announced: the refusal lands before the event, so there is no
      // consequence owed to anybody for a change that never happened.
      const journal = await journalFor(cwd);
      try {
        assert.deepEqual(readEvents(journal, { name: HARNESS_RULED }), [], "no event was raised");
        assert.deepEqual(pendingSteps(journal), [], "and no consequence is left owed");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 invariant · a DECLINE is no longer indistinguishable from a DISCHARGE — the record's reactor cannot skip a payload with no workspace root, and a real drain leaves that step failed and still owed rather than settled",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const record = ruling();
      const payload = { workspaceRoot: null, rulingId: "r-1", ruling: record };

      // The reactor, handed exactly what the transport would hand it.
      const refused = await refusalOf(() => EFFECTS[HARNESS_RULED][0].apply({ eventId: "r-1", name: HARNESS_RULED, payload }));
      assert.equal(refused.code, PROJECT_DIR_UNSET, "it refuses rather than returning a skip");

      // …and through the REAL dispatcher, which is where the skip did its damage:
      // `{ skipped: true }` is a RETURN, and `markStep` writes `done` for any reactor that
      // returns, whatever it returned. A settled step is never drained again, so that was
      // strictly worse than an unpaid one — the ruling was owed to nobody.
      const journal = await journalFor(context);
      try {
        const reactors = await applicableReactors(HARNESS_RULED, payload);
        const { eventId } = appendEvent(journal, { eventId: "r-1", name: HARNESS_RULED, payload, source: "test" }, reactors);
        const outcomes = await drainEffects({ journal, eventId });
        assert.deepEqual(outcomes.map((outcome) => outcome.status), ["failed"], `the step failed rather than settling (${JSON.stringify(outcomes)})`);
        assert.equal(readEventSteps(journal, eventId)[0].status, "failed", "…and the row says so, so no reader can mistake it for a discharge");
        assert.equal(pendingSteps(journal, { eventId }).length, 1, "…and the consequence is still owed, which is what an unpayable one has to look like");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 invariant · the guard reads the LEDGER, not the step's status — a ruling whose step is already settled and whose line is no longer there makes the seam refuse rather than report success over a knob it moved",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const rendered = committing();

      // The ruling, raised and recorded once — the ordinary path.
      await transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" });
      assert.equal((await readLedger(context.root)).total, 1, "the record landed the first time");

      // THEN THE OPERATOR REVERTS IT, which is the whole point of keeping the record in the
      // tracked tree: one `git revert` takes back the harness value AND the record. The
      // JOURNAL is per-node and lives outside the tree, so it survives that revert still
      // saying the step is discharged — a settled step behind a ledger that no longer holds
      // the line. This is not a contrived plant; it is the tree and the journal disagreeing,
      // which they are built to be able to do.
      await writeFile(context.configPath, CONFIG_TEXT, "utf8");
      await rm(context.ledgerFile, { force: true });

      const journal = await journalFor(context);
      try {
        assert.equal(readEventSteps(journal, "r-1")[0].status, "done", "the step still reads as discharged — the authority the guard used to trust");
        assert.deepEqual(pendingSteps(journal, { eventId: "r-1" }), [], "…so a drain legitimately runs nothing, exactly as it does for a redelivery");
      } finally {
        journal.close();
      }

      // Raised again: the knob moves again (facts precede announcements), and the record
      // must LAND again rather than be assumed from a status.
      const refusal = await refusalOf(() => transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-1" }));
      assert.equal(refusal.code, HARNESS_RECORD_NOT_STAMPED, "the seam refuses rather than returning success on a status it was handed");
      assert.equal(refusal.write?.changed, true, "…and it really was about to report success over a harness value it had just moved");
      assert.match(refusal.reason, /ledger/u, `…naming what it actually checked (${refusal.reason})`);
      assert.equal((await readLedger(context.root)).total, 0, "and no line appeared that could have justified a success");
    }),
  },
  {
    name: "61/05 invariant · ROUTE 2 — a committing ruling may not defer its record: `drain: false` is refused BEFORE the write, so the tree is unchanged and nothing is announced, while a report-only ruling defers as it always could",
    run: () => withFixtures(async () => {
      const context = await workspace();
      const refusal = await refusalOf(() => transitionHarnessRuled(committing(), { projectDir: context.root, journalOptions: context.journalOptions, drain: false }));
      assert.equal(refusal.code, HARNESS_DRAIN_NOT_OPTIONAL, "the combination is refused");
      assert.equal(refusal.reason, "verdict-commits", "…naming which half of the refusal applies");
      assert.equal(await readFile(context.configPath, "utf8"), CONFIG_TEXT, "the harness value never moved — the refusal is at the door, not after the write");
      assert.equal((await readLedger(context.root)).total, 0, "and no record landed");

      const journal = await journalFor(context);
      try {
        assert.deepEqual(readEvents(journal, { name: HARNESS_RULED }), [], "nothing was announced");
        assert.deepEqual(pendingSteps(journal), [], "and nothing is owed");

        // THE REFUSAL IS TARGETED, not a blanket ban: `drain: false` over a ruling that
        // WROTE NOTHING still works, because its record is journaled and the next drain
        // pays it — which is the shape task 03 reproduces a stopped process with.
        const deferred = await transitionHarnessRuled(ruling(), { projectDir: context.root, journalOptions: context.journalOptions, rulingId: "r-ok", drain: false });
        assert.equal(deferred.write, null, "a report-only ruling wrote no harness value");
        assert.equal((await readLedger(context.root)).total, 0, "…and its record is not written yet");
        assert.equal(pendingSteps(journal, { eventId: "r-ok" }).length, 1, "but it IS owed — journaled, and recoverable by any later drain");
        await drainEffects({ journal, eventId: "r-ok" });
        assert.equal((await readLedger(context.root)).total, 1, "…which pays it");
      } finally {
        journal.close();
      }
    }),
  },
  {
    name: "61/05 invariant · ROUTE 3 — `drain: false` with a journal that cannot be opened is refused: a consequence owed to nobody is a loss rather than a deferral, and the drain itself is still never gated on the ledger's health",
    run: () => withFixtures(async () => {
      // An unopenable journal, through the module's OWN injection point (`options.sqlite`,
      // the seam by which a runtime with no SQLite is simulated) rather than a filesystem
      // trick that would behave differently on each platform.
      const broken = (context) => ({ ...context.journalOptions, sqlite: {} });

      for (const [shape, rendered] of [["a committing ruling", committing()], ["a report-only ruling", ruling()]]) {
        const context = await workspace();
        const refusal = await refusalOf(() => transitionHarnessRuled(rendered, { projectDir: context.root, journalOptions: broken(context), rulingId: "r-1", drain: false }));
        assert.equal(refusal.code, HARNESS_DRAIN_NOT_OPTIONAL, `${shape}: refused rather than dropped`);
        assert.equal(await readFile(context.configPath, "utf8"), CONFIG_TEXT, `${shape}: no harness value moved`);
        assert.equal((await readLedger(context.root)).total, 0, `${shape}: and no record landed`);

        const journal = await journalFor(context);
        try {
          assert.deepEqual(pendingSteps(journal), [], `${shape}: nothing is owed to a journal that could not be opened, which is exactly why this is refused rather than deferred`);
        } finally {
          journal.close();
        }
      }

      // AND THE CONTRAST, which is the reason the refusal is this narrow: with the drain
      // in place, the same unopenable journal changes nothing about the outcome. The
      // cascade still runs, the record still lands, and only its DURABILITY was lost —
      // behaviour in this family is never gated on the ledger's own health (the d2 rule).
      const context = await workspace();
      const result = await transitionHarnessRuled(committing(), { projectDir: context.root, journalOptions: broken(context), rulingId: "r-2" });
      assert.equal(result.eventId, null, "the journal really was unavailable");
      assert.equal(result.write.changed, true, "the harness value moved");
      const ledger = await readLedger(context.root);
      assert.equal(ledger.total, 1, "…and its record landed anyway");
      assert.equal(ledger.records[0][LEDGER_LINE_KEY], "r-2", "…under the ruling that raised it");
    }),
  },
  {
    name: "61/05 invariant · THE INVARIANT, EXHAUSTIVELY — sixteen combinations of verdict, drain, journal health and project directory: no knob ever moves without its line, no success with a write is unrecorded, and a success with no line is always still owed",
    run: () => withFixtures(async () => {
      // The whole point of a matrix here rather than three more scenarios: the three routes
      // were three doors into ONE room, and a guard per door leaves the fourth door
      // unwatched. This asks the property directly, of every shape the seam has.
      //
      // THE CWD IS A SACRIFICIAL WORKSPACE for the duration. If the `project-dir-unset`
      // refusal ever regresses, the relative path resolves HERE — so the regression shows
      // up as a failed assertion on a fixture rather than as a write into whatever tree the
      // suite happens to run in.
      const sacrificial = await workspace();
      const previous = process.cwd();
      process.chdir(sacrificial.root);
      const rows = [];
      try {
        let index = 0;
        for (const verdict of ["commit", "report-only"]) {
          for (const drain of [true, false]) {
            for (const health of ["open", "unopenable"]) {
              for (const dir of ["named", "absent"]) {
                const context = await workspace();
                const rulingId = `r-${index += 1}`;
                const label = `${verdict} / drain:${drain} / journal:${health} / dir:${dir}`;
                const rendered = verdict === "commit" ? committing() : ruling();
                const journalOptions = health === "open" ? context.journalOptions : { ...context.journalOptions, sqlite: {} };
                const opts = { journalOptions, rulingId, drain, ...(dir === "named" ? { projectDir: context.root } : {}) };

                let outcome = null;
                let refusal = null;
                try {
                  outcome = await transitionHarnessRuled(rendered, opts);
                } catch (error) {
                  refusal = error;
                }

                const config = await readFile(context.configPath, "utf8");
                const line = (await readLedger(context.root)).records.some((record) => record?.[LEDGER_LINE_KEY] === rulingId);
                const journal = await journalFor(context);
                let owed = 0;
                try {
                  owed = pendingSteps(journal, { eventId: rulingId }).length;
                } finally {
                  journal.close();
                }
                const moved = config !== CONFIG_TEXT;

                // THE INVARIANT, in the three forms it has to hold in.
                assert.ok(!moved || line, `${label}: a harness value moved and its line is in the ledger`);
                assert.ok(!(outcome?.write) || line, `${label}: a returned success carrying a write has its record`);
                assert.ok(refusal == null || refusal.code != null, `${label}: a refusal is coded, never a bare failure (${refusal?.message ?? ""})`);
                if (outcome && !line) assert.equal(owed, 1, `${label}: a success with no line has that record OWED, journaled and recoverable`);

                rows.push(`${label} -> ${refusal ? `refused:${refusal.code}` : line ? "recorded" : "deferred"}`);
              }
            }
          }
        }

        // …and the census of what each shape actually does, so this is a specification and
        // not only a property: eleven refusals, four records, one legitimate deferral.
        assert.deepEqual(rows, [
          "commit / drain:true / journal:open / dir:named -> recorded",
          "commit / drain:true / journal:open / dir:absent -> refused:project-dir-unset",
          "commit / drain:true / journal:unopenable / dir:named -> recorded",
          "commit / drain:true / journal:unopenable / dir:absent -> refused:project-dir-unset",
          "commit / drain:false / journal:open / dir:named -> refused:harness-drain-not-optional",
          "commit / drain:false / journal:open / dir:absent -> refused:project-dir-unset",
          "commit / drain:false / journal:unopenable / dir:named -> refused:harness-drain-not-optional",
          "commit / drain:false / journal:unopenable / dir:absent -> refused:project-dir-unset",
          "report-only / drain:true / journal:open / dir:named -> recorded",
          "report-only / drain:true / journal:open / dir:absent -> refused:project-dir-unset",
          "report-only / drain:true / journal:unopenable / dir:named -> recorded",
          "report-only / drain:true / journal:unopenable / dir:absent -> refused:project-dir-unset",
          "report-only / drain:false / journal:open / dir:named -> deferred",
          "report-only / drain:false / journal:open / dir:absent -> refused:project-dir-unset",
          "report-only / drain:false / journal:unopenable / dir:named -> refused:harness-drain-not-optional",
          "report-only / drain:false / journal:unopenable / dir:absent -> refused:project-dir-unset",
        ], "every shape does what it says, and the only success with no line is the one that is still owed");
      } finally {
        process.chdir(previous);
      }

      // THE MEASUREMENT THAT MADE ROUTE 1 THE WORST ONE: the tree the process was standing
      // in is untouched, by either write.
      assert.equal(await readFile(sacrificial.configPath, "utf8"), CONFIG_TEXT, "the configuration under the cwd never moved");
      assert.equal((await readLedger(sacrificial.root)).total, 0, "…and no record was written into it either");
    }),
  },
];

export const harnessRulingSeamTests = [...featureZero, ...featureOne, ...featureTwo, ...featureThree, ...theInvariant];
