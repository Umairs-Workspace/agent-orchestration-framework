# 198/02 · Mocks are drawn on the system and committed as the baseline — example map
<!--
Drafted at refine's discovery beat (2026-11-26). "The canvas" is a Design artifact,
https://claude.ai/artifact/9Qm2LrT4vWx8YbN3cK7pZd, at version "4". Its canvas.json boards are
"fleet-filter.dc.html" (1280x884) and "fleet-filter-390.dc.html" (390x274). "The system" is
the Design System titled "AOF", https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd, at version "2",
installed into the canvas as project/ds/aof/tokens.json. "The pulled dir" is what the session
read back: project/canvas.json, the two boards, project/ds/aof/tokens.json and
artifact-type/dc-runtime.js. "mocks/" is the milestone's own mocks dir.
ADR-002, ADR-005, ADR-006 and ADR-007 settle every rule below, and the story's Notes settle the
rest (the canvas is drawn whenever the practice is on, amended 2026-11-27 from "offered", and
verify pulls back an approved canvas not yet imported), so no
business question is left for a person. Each engineering choice still open is technical, and
takes the default it names.
-->

## R1 · The practice's prose reaches Claude's refine, verify and designer brief, and no other runtime's, and with it off every render is today's
- E1 · No work.ui block: the rendered refine, verify and aof-designer, for claude, codex and opencode, equal the golden baselines byte for byte, and no rendered file holds "slot:" [proposed]
- E2 · "enabled": true, "name": "AOF": ".claude/commands/aof/refine.md" holds the canvas step, ".claude/commands/aof/verify.md" the pull-back and ".claude/agents/aof-designer.md" the system rule. ".opencode/commands/aof/refine.md", ".agents/skills/aof-refine/procedure.md", ".codex/agents/aof-designer.toml" and ".opencode/agents/aof-designer.md" hold none of them [proposed]
- E3 · In every runtime's render of aof-designer, with the practice on and with it off, "tools" is Read, Grep, Glob, Write, Edit, WebSearch, WebFetch [proposed]

## R2 · Refine draws the milestone's mocks on the resolved system whenever the practice is on, and nothing becomes a baseline until the operator approves it
- E4 · "name": "AOF", and exactly one Design System titled "AOF": the session draws the milestone's surfaces on the milestone's page of the project's canvas, with the system installed, and asks "Approve these mocks?" with the page's link, offering Approve, Revise and Later. Amended 2026-11-27 (ADR-006 §0): the page, not a canvas of its own [proposed]
- E24 · Amended 2026-11-27. The block names no "canvas": the session creates one, records it with "use --canvas", and draws on page "m<NN>" [proposed]
- E5 · Two Design Systems titled "AOF": the session stops before drawing, naming "AOF" and both titles and links. No canvas is created [proposed]
- E6 · The operator answers Revise, "the chip row is too tall": the same canvas is revised and asked about again, at its new version. mocks/ is untouched until Approve [proposed]
- E7 · The operator answers Later: refine ends with DESIGN.md naming the canvas link as awaiting approval, and the surface's binding checklist is its baseline. mocks/ is untouched [proposed]
- E8 · Amended 2026-11-27 (F-05). The practice is on: refine asks no "how do you want the mocks" question, offers neither the binding checklist alone nor the operator's own mocks, and draws. Hand-made mocks under mocks/ are a reference for the drawing, never the baseline [proposed]
- E25 · Amended 2026-11-27. The canvas has 60 boards and no pages, titled "37 · …", "34 · …" and some with no number: "aof design-system canvas pages" puts each numbered board on "m<NN>" and the rest on "earlier", first, and changes nothing but each board's "page". A canvas that has pages is never re-sorted; "--item 12" only adds "m12" [proposed]
- E26 · Amended 2026-11-27. Page m37 already holds two boards: refine starts from them, brings their literal colours onto the system's tokens, adds the surfaces the page lacks, and says which boards changed in the approval question. It draws nothing from scratch beside them [proposed]
- E27 · Amended 2026-11-27. mocks/ holds an import of page m37 at the page's current version, and the scope is unchanged: refine draws nothing and asks nothing [proposed]
- E28 · Amended 2026-11-28. The canvas already has the operator's pages "portal-03" ("03 · Task portal") and "directory-05" ("05 · Directory"), and the stream spells milestone 5 "05": "--item 05" and "--item 5" both answer "directory-05" and add nothing. On a canvas with no pages, a board titled "5 · …" lands on "m05", the page "--item 5" answers [proposed]

## R3 · The session never writes to the system at refine, and in reference mode what the system lacks is a gap for its owner
- E9 · "mode": "reference", and a surface needs a warning colour the system does not hold: the canvas draws it with the system's existing tokens, DESIGN.md names "a warning colour" under "## Design-system gaps", and nothing is published to the system [proposed]
- E10 · "mode": "owned": the canvas installs the system, and nothing is published to the system either [proposed]

## R4 · "mocks import" commits a pulled, approved canvas under mocks/ with its runtime and provenance, and it is self-contained
- E11 · The pulled dir, with "--canvas <the canvas> --canvas-version 4 --system <the system> --system-version 2 --approval 'run 20261126T204530509Z-0000 ask 1'": mocks/ holds canvas.json, both boards, support.js (dc-runtime.js's bytes) and ds/aof/tokens.json. README.md records the canvas link and version, the date, the approval and the system's link and version [proposed]
- E12 · A pulled file "project/../../.aof/aof.config.json", or "project/notes.md": refused, naming the file, and nothing is written [proposed]
- E13 · No "--approval": refused, and nothing is written [proposed]
- E14 · Version 5, which drops "fleet-filter-390.dc.html", is imported over version 4: the previous import's files are replaced whole, so that board and its frame are gone, and "PROMPT.md" beside them is untouched [proposed]
- E21 · Amended 2026-11-27. A canvas with pages "earlier" and "m12", imported with "--page m12": mocks/ holds only m12's boards, its canvas.json names only them and that page, README.md has "Page: m12 (12 Fleet filter)", and capture frames only them [proposed]
- E22 · A board with no "page" is on the first page: "--page m12" refuses it as on another page, and "--page earlier" imports it [proposed]
- E23 · "--page m12" on a canvas without that page, or with no boards on it: refused, naming the canvas's pages [proposed]
- E15 · An imported board loads "./support.js", "ds/aof/tokens.json" and a Google Fonts css2 link: the self-contained control passes. One that loads "https://cdn.example.com/x.js": the control fails, naming the board [proposed]

## R5 · "mocks capture" frames each imported board at its own size, and records the frames
- E16 · After E11: "fleet-filter.png" at 1280x884 CSS pixels and "fleet-filter-390.png" at 390x274, at scale 2, and README.md's frame table lists both, in canvas order [proposed]
- E17 · No browser is found: refused with the rasterizer's fix, no PNG is written, and README.md is unchanged [proposed]
- E18 · mocks/ holds no import: refused, saying to import first [proposed]

## R6 · Verify pulls back an approved canvas that is not yet imported, before the fidelity judge
- E19 · DESIGN.md names a canvas awaiting approval, and the operator approves it at verify: the session pulls it, imports it, captures it, names the frames in DESIGN.md, and only then hands the frames to the judge [proposed]
- E20 · The operator answers Later at verify: nothing is imported, and the judge works from the binding checklist [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001§2 · Where does refine's canvas step hang? A new block slot "decide.designer", after the mock-elicitation bullets of refine's Decide stage. Its twin is in the Codex refine procedure of workflow.md, empty there, because 192/ADR-002 §7 puts every common slot in each authored variant.
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-002§2 · Which slots do the designer and verify get? "ownership.design-system" at the end of aof-designer's ownership block, and "conformance.baseline" before verify's renderability precondition. Each is mirrored in its Codex section of workflow.md.
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006§2 · How does import learn the provenance? Through required flags: "--canvas", "--canvas-version", "--system", "--system-version" and "--approval". Both links are checked as claude.ai artifact links, by 01's check.
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-002§3 · What is the approval's reference? In a driven session, "run <runId> ask <n>", the loop's record of the answer. Interactively, "session <sessionId> <ISO instant>". Import treats it as an opaque, non-empty string.
- Q5 · technical · defaulted ARCHITECTURE.md#ADR-006§4 · What does a re-import replace? The files the previous import's README lists, and nothing else. It refuses to overwrite any file it did not write, for example a hand-written README.md.
- Q6 · technical · defaulted ARCHITECTURE.md#ADR-006§2 · Which item does "--item" take? A milestone, whose folder holds mocks/. A story or any other type is refused.
- Q7 · technical · defaulted ARCHITECTURE.md#ADR-003§2 · How does capture reach a browser while the package spawns nothing (FF-19804)? Core injects the rasterizer through the practice's command services, as it injects the Hyperagent verbs' collaborators. The rasterizer gains a page entry beside rasterizeSvg. That entry shares the one argv builder (FF-13303) and the done-poll.
- Q8 · technical · defaulted wiki/work/archive/47_milestone_fleet-repo-filter/mocks/README.md · At what scale? 2, as milestone 47's frames were taken.
- Q9 · technical · defaulted STORY.md#Notes · Which answers does the approval ask offer? Approve, Revise (with the change in the answer's text) and Later. Later is what verify's pull-back exists for.
- Q10 · technical · defaulted ARCHITECTURE.md#ADR-006§0 · How many canvases? Settled by the operator 2026-11-27 in conversation, and recorded in ADR-006 §0 (198 VERIFICATION F-04): ONE for the project, named in "work.ui.designSystem.canvas", with a page per milestone (id "m<NN>") and one board per surface, state and breakpoint. It replaces the default of one canvas per milestone, which would have left a growing list of design files (198 VERIFICATION F-04).
- Q11 · technical · defaulted ARCHITECTURE.md#ADR-007§2 · Where is a reference-mode gap recorded? Under "## Design-system gaps" in DESIGN.md. The designer can write it, and refine's hand-back lists the gaps for the operator to pass to the system's owner.
- Q12 · technical · defaulted ARCHITECTURE.md#ADR-006§2 · How does FF-19805 find an imported mock? README.md's "Canvas:" line, which only import writes.
- Q13 · technical · defaulted wiki/work/archive/07_milestone_design-conformance/ARCHITECTURE.md · Do the verbs commit? No. They write the files, and the phase's own commit carries them.
- Q14 · technical · defaulted RESEARCH.md#R2 · The Design type says never to render or screenshot a canvas unless the user asked. Does capture break that? No. It frames the imported local copy, through the CLI, and never the canvas.
