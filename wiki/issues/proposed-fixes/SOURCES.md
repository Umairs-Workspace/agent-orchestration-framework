# Sources

Every external claim in `ANALYSIS.md` and the four fix documents, with its citation. Internal
evidence — telemetry, commit logs, the agent and command files — is cited inline in those documents
by path and is not repeated here.

**§4 is the only place in this folder that names a third-party project.** Deleting that one section
removes every named external reference from the folder; nothing above it depends on a name.

---

## 1 · Peer-reviewed and preprint research

**Self-correction is net-negative without an external oracle.**
Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*, ICLR 2024.
<https://arxiv.org/abs/2310.01798>
Used for: GPT-4 on GSM8K falling 95.5% → 91.5% → 89.0% across intrinsic self-correction rounds, and
recovering only when given oracle labels. Cited in `ANALYSIS.md` §3.4 and `FIX-3`.

**The multi-agent failure taxonomy.**
Cemri et al., *Why Do Multi-Agent LLM Systems Fail?*
<https://arxiv.org/abs/2503.13657>
Used for: step repetition at 17.14% of observed failures and "unaware of stopping conditions" at
9.82%. Cited in `ANALYSIS.md` §3.4 and `FIX-3`.

**More context measured worse, on the same benchmark.**
Yang et al., *SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering*.
<https://arxiv.org/abs/2405.15793>
Used for the agent-computer-interface ablations on the 300-instance SWE-bench Lite subset:

| ablation | configuration | resolved |
|---|---|---:|
| file viewer | 100-line window (baseline) | **18.0%** |
| | 30-line window | 14.3% |
| | entire file | **12.7%** |
| context | last 5 observations (baseline) | **18.0%** |
| | full history | **15.0%** |

Cited in `ANALYSIS.md` §3.1 and `FIX-2`.

**Roles do not buy accuracy.**
Zheng et al., *When "A Helpful Assistant" Is Not Really Helpful: Personas in System Prompts Do Not
Improve Performances of Large Language Models*, Findings of EMNLP 2024.
<https://arxiv.org/abs/2311.10054> · <https://aclanthology.org/2024.findings-emnlp.888/>
Used for: 162 personas across 2,410 questions and four model families, no improvement over the
control. Cited in `ANALYSIS.md` §4.

**A phase-based approach with no role agents.**
Xia et al., *Agentless: Demystifying LLM-based Software Engineering Agents*.
<https://arxiv.org/abs/2407.01489>
Used for: **32.00% of SWE-bench Lite resolved at $0.70 per issue**, outperforming every open-source
agentic approach published at the time on both resolve rate and cost. Cited in `ANALYSIS.md` §4.

---

## 2 · Vendor documentation and engineering write-ups

**The reviewer-over-reporting effect.** Claude Code best practices — *Add an adversarial review step*.
<https://code.claude.com/docs/en/best-practices>
Quoted verbatim in `ANALYSIS.md` §3.3 and `FIX-1`:

> A reviewer prompted to find gaps will usually report some, even when the work is sound, because
> that is what it was asked to do. Chasing every finding leads to over-engineering: extra abstraction
> layers, defensive code, and tests for cases that can't happen. Tell the reviewer to flag only gaps
> that affect correctness or the stated requirements, and treat the rest as optional.

And, from the same section, the reason a fresh reviewer is worth spawning at all — quoted in
`ANALYSIS.md` §3.1 and `FIX-2`:

> A reviewer running in a fresh subagent context sees only the diff and the criteria you give it,
> not the reasoning that produced the change, so it evaluates the result on its own terms.

Also used, in `FIX-4`: *"Two teammates editing the same file leads to overwrites. Break the work so
each teammate owns a different set of files."*

**Subagent context and model selection.** Claude Code subagents documentation.
<https://code.claude.com/docs/en/sub-agents>
Used for: a subagent runs in its own context window and returns only its summary — so its first
request does not read the parent's cache; and *"For simple subagent tasks, specify `model: haiku`"*.
Cited in `ANALYSIS.md` §3.1 and §4.

**Cache lifetime.** Claude Code cost management — *Why usage climbs in a long session*.
<https://code.claude.com/docs/en/costs>
Used for: the cache lifetime is one hour on a subscription and five minutes on an API key or cloud
provider, extendable with `ENABLE_PROMPT_CACHING_1H=1`. Cited in `ANALYSIS.md` §3.1 and `FIX-2`.

**Team size and token multiplier.** Claude Code agent teams documentation, and the cost page's
*Manage agent team costs*.
<https://code.claude.com/docs/en/agent-teams> · <https://code.claude.com/docs/en/costs>
Used for: *"Start with 3-5 teammates"*, *"Three focused teammates often outperform five scattered
ones"*, *"Use Sonnet for teammates"*, and approximately **7× the tokens of a standard session when
teammates run in plan mode**. Cited in `ANALYSIS.md` §4.

**The multi-agent token multiplier and the model-routing result.**
Anthropic, *How we built our multi-agent research system*.
<https://www.anthropic.com/engineering/multi-agent-research-system>
Used for: *"Multi-agent systems use about 15× more tokens than chats"*, and *"A multi-agent system
with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude
Opus 4 by 90.2%"*. Cited in `ANALYSIS.md` §4.

---

## 3 · Internal evidence

Not external, listed so the provenance of every number is in one place.

| Claim | Where it comes from |
|---|---|
| 12h42m, 77 commits, 7 `feat`, 43 minutes of feature work | commit log of a downstream work stream's seven-story milestone |
| ~3.12M subagent tokens across 16 agents on one refine | that run's own cost summary |
| 3,082,276 cache-creation tokens per spawn; 538:1 in:out; 32.2h active / 50.0h stalled | 42 agent runs across a downstream stream's `observability/agents.json` snapshots |
| Milestone 52: 13 delta-application runs, 661.6k output tokens, 41.8% | `wiki/work/52_*/observability/` |
| Milestone 66: 91 findings against 59 verification rows, five closure rounds | `wiki/work/66_*/` record docs |
| One `aof:continue` at 1h55m delivering nothing; 37 minutes of a reviewer at zero bytes | `wiki/issues/ISSUE-the-run-hung-and-nothing-noticed.md` |
| Two "independent" stories editing one file ×9 and ×8 | `src/bundle/commands/continue.md`, milestone-lane fan-out note |
| Eight agents, six frontmatter keys, no `maxTurns`/`effort`/`permissionMode`, 7 of 8 on `opus` | `.claude/agents/aof-*.md` |
| Four reviewers holding `Edit` against their own descriptions | same |
| No round bound in any command or agent file | grep across `src/bundle/` |

---

## 4 · Named third-party projects

**This section is the only named external reference in the folder. It can be deleted without
affecting any argument above.** The two projects below are public open-source repositories; they are
described by mechanism only, and never by name, in `ANALYSIS.md` and the fix documents. They are
recorded here because taking a mechanism from someone else's work and not saying so is worse than
citing it.

- **`open-gsd/gsd-core`** (branch `next`, `agents/`) — <https://github.com/open-gsd/gsd-core>
  Source of the mechanisms behind Fix 2 (a per-task `read_first` whitelist and declared write set,
  with a read-depth rule that drops to frontmatter-only for prior work), Fix 3 (an iteration cap
  plus separate non-convergence detection offering force-proceed / guidance / abandon) and Fix 4
  (same-wave file-overlap partitioning). Also the source of the context-budget sizing rule described
  in `ANALYSIS.md` §4 — task counts per plan, the five-file split trigger, the ~50% window target,
  the calibration factor from the project's own estimate-versus-actual history — which is noted
  there but is **not** one of the four proposed fixes.

- **`affaan-m/ECC`** — <https://github.com/affaan-m/ECC>
  Source of the reviewer discipline block behind Fix 1: the >80% confidence gate, *"a clean review is
  a valid review"*, the explicit do-not-flag list, and the four-part evidence check before a finding
  may be reported.

Both are surveyed critically in `ANALYSIS.md` §5 — the catalogue sizes there (31–33 agents and 72
commands with two internal documents disagreeing; 68 agents, 286 skills and 513 auto-loadable
instruction files with no published overhead measurement) refer to these and to other frameworks
reviewed alongside them. Mechanisms were taken; inventories were not.
