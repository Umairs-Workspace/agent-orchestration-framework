# 203/00 · The harness — example map
<!--
Drafted 2026-11-20 by the PO at refine's discovery beat. Grounding, measured the same day
(ARCHITECTURE "Measured facts"): two inits differ only in the lock's instants; nothing in the
tree carries an absolute path; the version appears only in the lock; hashes appear in the lock
and the journal. Every rule here is the SPEC's or an ADR's. No person was asked, so every example
is proposed.
-->

## R1 · A verb runs in a temp project with a temp global home, and both trees are captured
- E1 · A fixture step writes `a.md` into the project and `x.json` into `$AOF_GLOBAL_HOME`: the captured project tree is `a.md` and the captured home tree is `x.json` [proposed]
- E2 · A step writes `.claude/settings.json` and `.gitignore`: both dotfiles are in the captured tree [proposed]
- E3 · A step exits 3 where the scenario declares 0: the scenario fails naming step 1 and its argv, and shows its stderr [proposed]
- E4 · A step writes nothing into the home: the home tree is captured as empty, and an expected empty home passes [proposed]
- E5 · Pass or fail, the scenario's temp root is gone when the scenario returns, and the real `~/.aof` was not read or written [proposed]

## R2 · Six rules normalise what is meant to vary, and nothing else
- E6 · `"generatedAt": "2026-11-20T18:24:42.679Z"` becomes `"generatedAt": "<timestamp>"` [proposed]
- E7 · `C:\\Users\\u\\AppData\\Local\\Temp\\aof-golden-x\\project\\.claude` in a JSON string becomes `<project>/.claude` [proposed]
- E8 · On macOS a step reports `/private/var/folders/…/project/a.md` for a root created as `/var/folders/…/project`: it becomes `<project>/a.md` [proposed]
- E9 · `sha256:` and 64 hex digits becomes `sha256:<hash>`, and `sha256:abc` is left alone [proposed]
- E10 · A prose line `matches \d+\\.md` keeps its backslashes, and `10.1.0` is not read as version `0.1.0` [proposed]
- E11 · A file of CRLF lines compares equal to the same file with LF lines [proposed]
- E12 · A captured file with invalid UTF-8 bytes fails the scenario naming the file [proposed]

## R3 · The expected tree is the base's tree, minus what is removed, overlaid with the scenario's own files, and drift fails with a summary, a diff per file and the command that accepts it
- E13 · Base holds `a.md` and `b.md`. The scenario stores `b.md` changed, and `removed.golden` lists `project/a.md`: the expected tree is the changed `b.md` alone [proposed]
- E14 · A scenario names a base that does not exist: the run fails naming the scenario and the missing base [proposed]
- E15 · `x` names base `y` and `y` names base `x`: the run fails naming the chain `x → y → x` [proposed]

- E16 · One line in `b.md` changed: the failure says `1 changed`, lists `project/b.md`, shows a hunk with 3 lines of context, and ends with `node scripts/golden.mjs --lane fixture --scenario s --update` [proposed]
- E17 · A file the baseline lacks appears: `1 added`, and its diff is against nothing [proposed]
- E18 · 25 files changed: 25 paths are listed, 20 diffs are shown, and the message says 5 were left out [proposed]
- E19 · A step's envelope changed and no file did: the failure says the step records changed and shows their diff [proposed]
- E20 · A scenario has no committed baseline: the run fails with the update command and writes nothing [proposed]

## R4 · Only `scripts/golden.mjs --update` writes a baseline
- E21 · The suite runs against a drifted tree: it fails, and every byte under the baseline root is unchanged [proposed]
- E22 · `--update` on a derived scenario whose output matches its base except one file: exactly that file is stored, plus `removed.golden` and `steps.golden` [proposed]
- E23 · `--update --scenario base` after the base changed: the base and every scenario whose chain includes it are rewritten, base first [proposed]
- E24 · A second `--update` with nothing changed writes no file and says so [proposed]
- E25 · A file the scenario no longer differs on is removed from its stored delta by `--update` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001 · In-process or child process? (Child process through `spawnCliSync`, so the command door's writes are captured.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-004 · How many diffs does a failure print? (The first 20 in path order, and a count of the rest. The script prints all of them.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-004 · Which diff? (A line LCS in the repo, with 3 lines of context. No package is added.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-003 · Where do baselines live, and why the suffix? (`test/golden/baselines/<lane>/<scenario>/`, every file ending `.golden`, so no sweep, census, graph or runtime reads them.)
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-004 · May an environment variable turn a test run into an update? (No. Only the script's flag writes.)
