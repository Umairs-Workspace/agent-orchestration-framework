---
name: "aof-map-tests"
description: "Draft the project's testing instructions from its test roots, runners, native tests and known hazards, set work.test.instructions, and hand the draft to the operator to edit."
---

<!-- aof-generated: true; aof-runtime: codex -->

Arguments: [--dry-run]

Use the native skill $aof-map-tests; $ARGUMENTS is the operator text after its name.

## Codex execution contract
Use only tools actually exposed by this session. File reading/editing, shell execution, search,
browser/image tools and native role tools are capability-dependent; Claude tool aliases are not
permissions. Instruction-level read-only boundaries do not claim enforced sandbox isolation.
In solo mode perform required roles inline and spawn nothing. Orchestrated independent work
requires a native launcher such as spawn_agent when exposed, independent context and support
for each selected model/effort; otherwise report native-role-capability-unavailable or
native-role-setting-unsupported before claiming independence. Stay within the resolved dispatch
bound and review/no-progress bounds. Read role settings from work.agents.runtimes.codex.
Never infer the primary assistant from the delegation toggle.
For questions, use an available native question tool, or ask explicitly in the conversation when
that tool is unavailable. Required answers remain pending until received. A driven business question
retains its map token and one-question-per-ask form. Permission approval uses the host approval flow,
not a question tool or elapsed time. AOF_NEEDS_INPUT is for an actually unanswered blocked turn,
never a fabricated native capability.

<objective>
Give agents one plain-words file that tells them how this project tests. The project owns the
choice of suites, the changes that need no run, and the hazards on this machine.
</objective>

<config>
Read `.aof/aof.config.json`, including `work.test`, `work.dir` and `work.test.instructions`.
Use the declared instructions path, or `wiki/TESTING.md` when none is declared. Preserve an existing
file's useful instructions and the operator's edits. `--dry-run` previews the draft and config diff
and writes nothing: both files remain byte-identical. With no flag, write the draft and set the key.
</config>

<process>
1. **Read the repository.** Read the declared test roots and suite suffixes, runner scripts and
   package test scripts. Identify native `node:test` packages and how their own runners execute
   them. Read known hazards from the project's existing testing guidance and work records. Report
   gaps you cannot establish; do not guess commands or claim a run happened.
2. **Draft the instructions file.** Map areas to suites, including consumers reached through the
   application assembly and suites that construct paths from fragments. Explain record-only and
   docs-only changes that need no run, native-test commands, slow lanes, and machine hazards such
   as fixed ports. Say that the whole tree is the regression gate's. Tell agents to read this file
   before choosing suites, use `aof test <suite>… --reason "<why>"`, check fixes with
   `aof test --failed`, and consult `aof test --suggest` for importers and path mentions.
3. **Show the draft.** Under `--dry-run`, stop here with the proposed instructions and config diff.
   Otherwise write the instructions and set `work.test.instructions` to its project-relative path.
   This command neither authors couplings nor replays commits. It changes no test or runner.
4. **Check and hand over.** Run `aof project doctor` and report `test-instructions`,
   `test-layout-suites` and `test-layout-resume`. Ask the operator to edit the draft: they know the
   project's hazards and coverage gaps. A missing runner or incomplete suite/resume declaration
   stays a named gap; this draft does not invent runner support.
</process>

<output>
Show the instructions path, the draft, the `work.test.instructions` config diff and the doctor's
checks (or the dry-run preview). Ask the operator to edit the draft before relying on it. Give no
estimate of time saved and make no claim about tests having passed.
</output>
