---
description: Draft the project's testing instructions from its test roots, runners, native tests and known hazards, set work.test.instructions, and hand the draft to the operator to edit. On an existing repo it also migrates the removed work.test.couplings into the instructions and deletes the key.
argument-hint: "[--dry-run]"
allowed-tools: [Read, Grep, Glob, Bash, Edit, Write, AskUserQuestion]
---
<objective>
Give agents one plain-words file that tells them how this project tests. The project owns the
choice of suites, the changes that need no run, and the hazards on this machine.
</objective>

<config>
Read `.aof/aof.config.json`, including `work.test`, `work.dir`, `work.test.instructions` and any
`work.test.couplings`.
Use the declared instructions path, or `TESTING.md` under `work.dir` (for example
`wiki/work/TESTING.md`) when none is declared: `work.dir` is aof's folder in the project. Preserve an existing
file's useful instructions and the operator's edits. `--dry-run` previews the draft and config diff
and writes nothing: both files remain byte-identical. With no flag, write the draft and set the key,
and remove `work.test.couplings` when the repo still has it.
</config>

<process>
1. **Read the repository.** Read the declared test roots and suite suffixes, runner scripts and
   package test scripts. Identify native `node:test` packages and how their own runners execute
   them. Read known hazards from the project's existing testing guidance and work records. Report
   gaps you cannot establish; do not guess commands or claim a run happened.
2. **Migrate an existing repo's couplings.** `work.test.couplings` was removed (210/ADR-008), and
   `aof test` refuses while the key is present. When it is present, carry every entry into the
   instructions as an area row, so no mapping the project recorded is lost: the entry's `why` is the
   area, its `paths` are the files the area covers, and its `suites` are the suites to consider.
   Group a long suite list by directory with a count per directory, and merge entries that name the
   same area. Skip this step when the key is absent.
3. **Draft the instructions file.** Map areas to suites, including consumers reached through the
   application assembly and suites that construct paths from fragments. Explain record-only and
   docs-only changes that need no run, native-test commands, slow lanes, and machine hazards such
   as fixed ports. Say that the whole tree is the regression gate's. Tell agents to read this file
   before choosing suites, use `aof test <suite>… --reason "<why>"`, check fixes with
   `aof test --failed`, and consult `aof test --suggest` for importers and path mentions.
4. **Show the draft.** Under `--dry-run`, stop here with the proposed instructions and config diff.
   Otherwise write the instructions and set `work.test.instructions` to its project-relative path,
   and delete `work.test.couplings` from the config in the same write.
   This command neither authors couplings nor replays commits. It changes no test or runner.
5. **Check and hand over.** Run `aof project doctor` and report `test-instructions`,
   `test-layout-suites` and `test-layout-resume`. After a migration, run `aof test --suggest` to
   confirm `aof test` no longer refuses with `test-config-key-removed`. Ask the operator to edit the draft: they know the
   project's hazards and coverage gaps. A missing runner or incomplete suite/resume declaration
   stays a named gap; this draft does not invent runner support.
</process>

<output>
Show the instructions path, the draft, the config diff (`work.test.instructions` set, and
`work.test.couplings` removed when it was there) and the doctor's checks (or the dry-run preview). Ask the operator to edit the draft before relying on it. Give no
estimate of time saved and make no claim about tests having passed.
</output>
