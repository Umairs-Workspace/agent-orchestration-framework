<!-- fragment:contract.brief -->
  **The build brief — ONLY when the project has turned it on.** Read `work.plan.enabled` from
  `.aof/aof.config.json`. It defaults to **false**, and when it is absent or false you author **no
  plan document at all** — its absence is the normal state and nothing reports it. When it is true,
  write one `PLAN.md` in the story's own folder, from what you already read while drawing this
  story's boundary:

  - It carries **the mechanism** (the seam the change hangs off, in a few sentences) and **the
    verification step** (the end-to-end check that proves the story works) — the two things the
    frontmatter cannot express — plus what is deliberately out of scope.
  - **It restates no declared path.** The read and write sets have ONE home and it is the
    frontmatter you just authored; a table, a path list, or an enumeration in prose here is the
    second copy, and the third is whichever agent transcribes it. A single inline mention of the
    module a seam lives on is fine; an inventory is not.
  - **One page.** Aim at ~60 lines; the doc-budget lane warns past 80. Overflow is a sizing signal,
    not a budget to raise — a story you cannot brief in a page is a story that should be split.
  - **It is the BUILDER'S, and advisory.** No reviewer reads it, and a deviation from it is not a
    finding. Do not make it binding, and do not restate the contract in it: the task `.feature`
    scenarios are the contract.
