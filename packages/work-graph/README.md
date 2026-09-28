# @aof/work-graph

Private workspace for declared loop graphs, graph checks and derived documentation.
It does not execute delivery loops or own run persistence.

| Export | Responsibility |
| --- | --- |
| `registry` | Read loop records, parse the vocabulary and resolve declared relationships/ceilings. |
| `checks` | Pure grounding, pairing, arbitration, reference ownership, timescale and audit checks. |
| `shapes` | Shared Mermaid glyphs. |
| `record` | Pure execution projection over supplied registry/run/config data. |
| `record-render` | Pure execution graph and document rendering. |
| `document` | Deterministic registry-document composition and derived output path. |
| `commands` | Ordered six-command contribution with descriptor completeness checks. |
| `commands/*` | Package-owned command factories, schemas, routes, arguments and presentation. |

`loadLoops(workspace, { getFrameworkRoot })` uses the workspace's `.aof` directory.
Core supplies the installed framework root for framework-authored module pointers;
project records resolve against the project root. No root is inferred from this
package's file depth.

Read command factories take a loader. The groundedness command also takes command
lookup and framework-location services. The execution-record command takes item
resolution, local-checkout validation and run reads. The document command receives
the shared registry's invocation function. Creating descriptors or contributions
does not call any service.

Only the document and execution-record commands write, and only when explicitly
requested; they use `@aof/foundation/fs` atomic writes. Read-only registry/check
modules remain separately guarded. Shared bound vocabulary and resolution policy
live in `@aof/contracts/loop-bounds`, below graph and execution packages.

Run `yarn workspace @aof/work-graph test` for package tests. Cross-package regression
and architectural checks currently remain under the root `test/loop` and `test/arch`.
