# @aof/design-system

A project's one Design System, named in `.aof/aof.config.json` → `work.ui.designSystem`
(milestone 198).

- **The practice** `design-system`, on when `work.ui.designSystem.enabled` is `true`. It has no
  fragments yet: turning it on changes nothing a runtime renders (198/01). Stories 02 and 03 add them.
- **The command** `/aof:design-system extract`, Claude's alone and always installed: it builds a
  Design System artifact from the code's tokens and the exported mocks, then names it in config.
- **The verbs** (198/ADR-003), the deterministic half the command calls:
  - `aof design-system tokens <css-file>… [--mocks <dir>]… [--json]` prints the token lists a Design
    System reads, every value it could not place, and the colours only a mock paints;
  - `aof design-system check --tokens <tokens.json> [--source <css-file>]… [--json]` compares a
    system's tokens with the code and exits 1 on drift;
  - `aof design-system use --name <title> | --artifact <link> --mode owned|reference [--source <css-file>]… [--canvas <link>]`
    writes the block, naming the system by exactly one of its title and its link;
    `use --canvas <link>` alone names the project's one Design canvas and leaves the system as it is.
  - `aof design-system mocks import <pulled-dir> --item <milestone> … [--page <id>]` commits an
    approved canvas under the milestone's `mocks/`; with `--page`, only that page's boards.

The system and the canvas are two artifacts, because an artifact has one type: the Design System
holds the tokens and components, and the project's one Design canvas holds every milestone's mocks,
each milestone on a page of its own (ADR-005 and ADR-006, amended 2026-11-27).

The block's validator (`src/config.mjs`) is shared by `use` and `aof project validate`. No module
under `src/` reaches the network (FF-19804), and the CLI never resolves a system's title: that is
the session's one `list` call.
