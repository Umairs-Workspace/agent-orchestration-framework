---
description: Hand planning to the Hyperagent AOF Planner over MCP — it researches and writes the PRD, shatters it into backlog drivers (or refines a numbered item), and delivers a draft pull request; this session relays its questions, then checks the plan branch in a temporary checkout. Plans only; never merges.
---

<objective>
Delegate a planning step to Hyperagent and bring back a checked plan. Hyperagent's "AOF Planner"
agent runs AOF's planning skills against this repository through its GitHub integration and opens a
**draft** pull request; this session composes the brief, follows the run, relays any question to the
operator, and verifies the resulting branch with `aof work validate` — in a throwaway checkout, never
in the operator's working tree. Nothing is merged, checked out, or promoted here.
</objective>

<config>
Parse "$ARGUMENTS": an optional leading mode — `plan` (the default: PRD, then shatter, one PR), `prd`
(the PRD only), `shatter <PRD path>`, or `refine <ref>` (a numbered item) — then the request text.
`work.integrations.hyperagent` in `.aof/aof.config.json` names the planner `agent` (default
"AOF Planner"), `baseBranch`, `pollSeconds` (default 20) and `maxMinutes` (default 30); the verbs
below read it, so do not re-read it by hand.
</config>

<process>
1. **Preflight.** Confirm the Hyperagent MCP server's tools are available in this session
   (`create_thread`, `get_thread`, `send_message`, and the tool that lists your available agents).
   If they are not, run `aof work integrations hyperagent doctor` and print its hints — the server is
   registered with `claude mcp add --transport http hyperagent https://hyperagent.com/api/mcp` (then
   `/mcp` to sign in) — and STOP. Never try to authenticate or call Hyperagent another way.
2. **Compose the brief — never write it yourself.** Run
   `aof work integrations hyperagent brief <mode> [target] --request "<request>" --json`. A refusal
   (no request, no target, an unresolvable repository) is a stop: report it, and suggest `--repo
   <owner/name>` when the origin remote is not GitHub. Keep `agent`, `branch`, `message`,
   `pollSeconds` and `maxMinutes` from the envelope.
3. **Resolve the planner.** List the agents the server offers and pick the one whose name matches
   `agent` (case-insensitive). None → stop with the doctor's agent hint. Several → ask the operator
   which. Then call `create_thread` with that agent and the brief's `message` **verbatim**, and tell
   the operator the thread id and that the planner is working.
4. **Follow the run, bounded.** Call `get_thread` until the thread is no longer running. Between
   calls wait with a shell `sleep`, starting at `pollSeconds` and doubling to at most four times it;
   stop following once `maxMinutes` have passed, and hand the operator the thread id (it stays a
   normal Hyperagent thread they can open, or resume here later by asking to continue it). Print a
   one-line status every few polls — never the planner's full transcript.
5. **Relay questions; never answer them.** When the thread stops and its last assistant message has
   no `AOF-PLAN-RESULT` block, it is waiting on a person: put the planner's question to the operator
   with `AskUserQuestion` (quoting it, with its options when it gives any), send the operator's answer
   back with `send_message` on the same thread, and return to step 4. Never supply an answer the
   operator did not give, and never treat silence as approval.
6. **Read the result.** Write the planner's last message to a temporary file outside the work tree
   and run `aof work integrations hyperagent result <file> --json`. `status: blocked`, or no branch,
   is a stop: report what the planner said and the thread id.
7. **Check the branch.** Run `aof work integrations hyperagent check <branch> --json`. It fetches the
   branch, runs `aof work validate` over it in a temporary checkout, and lists any file outside the
   planning lane. Report the findings verbatim; a failing check is the operator's to fix — or send the
   findings back to the planner with `send_message` if the operator asks — never fix the branch here.
</process>

<output>
Report: the planner thread, the pull request URL, the plan branch, the files it changed, the
`aof work validate` verdict over the branch, anything outside the planning lane, and the open
questions count. Then the operator's next steps: review and merge the pull request; for a shatter,
`aof:promote <slug>` per driver in PRD order, then `aof:refine <NN>` (or `/aof:hyperplan refine <NN>`)
and `aof:continue <NN>`. Never merge, check out, or promote anything yourself.
</output>
