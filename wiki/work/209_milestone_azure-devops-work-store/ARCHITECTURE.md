---
doc: architecture
---
# 209 · A project-owned board behind WorkItemStore

## ADR-001 · Select one versioned board definition per workspace

Keep omitted `work.store` and `"files"` as the file provider. Add an object with a `manifest` path, for example `{"manifest":".aof/boards/team.yaml"}`. Resolve it from the project root. The synchronous workspace selector at `packages/work/src/store/work-item-store.mjs:43` can return a lazy board store. Its first operation awaits validation and adapter loading. Each workspace owns its own instance.

Version 1 of the YAML schema names board coordinates, type/field/state/relation and order mappings, required operation bindings, and optional capabilities. A binding names an adapter operation. AOF validates the document and dispatches typed inputs. The project module handles provider requests, pagination, sequencing and error translation. Use a data-only YAML parser with duplicate-key rejection. Report the failing key or operation before issuing a board mutation.

Resolve an explicitly selected adapter module relative to its definition. The resolved file and manifest must live under the project's real `.aof/` directory, including after symlink resolution. The module runs as project code with the process's authority. Read the data and validate its shape before importing it. Project discovery and the default file store never import adapters. Keep provider names, headers, URLs, process setup and CLI invocations in the opt-in example. A configured module can implement a second board without rebuilding AOF.

| Adapter operation | Responsibility |
|---|---|
| Read items | Return board IDs, per-item revisions, mapped values, memberships and relations. Support reading specific IDs for verification. |
| Read changes | Return ordered revision observations or equivalent comparison data plus an opaque continuation position. Surface deletions and loss of coverage. |
| Apply work-item changes | Accept stable operation identity, intended tracked values/relations and expected per-item revisions. Return applied IDs and revisions or per-item refusal/unknown outcomes. |
| Optional capabilities | A daemon-environment access probe may be requested by the definition. Attachment support declares eligible artifact paths and a copy operation. Resolve files within the item's document home and verify the attachment link. |

## ADR-002 · Journal board publication with its local document home

Keep the local folder and logical AOF ref throughout publication and execution. Maintain a durable per-workspace association from a stable local item key to its current ref, document home, board identity, desired tracked values, last acknowledged mapped values and revision. Scope provider IDs by board definition and project. Publish when refinement completes. Preserve links through renumber and reparent. In board mode a completed item retains its document home and board link. The archive operation belongs to local file mode. Local-only drafts and linked items appear once in a snapshot. Return authoritative faults for missing linked items or unusable mappings. Reads must preserve enough local desired state to resynchronise later.

The selected store composes document and placement services behind the mutation door at `packages/work/src/store/file-placement.mjs:18`. Preserve previews, locks, legal lifecycle moves, guarded rollback, document edits, ordering and ref repairs. Persist intent before issuing a remote write. A create needs a correlation key discoverable after a lost response. Journal each acknowledged member of a multi-item plan and reconcile uncertain outcomes by reading back the board before retrying. Concurrent workers claiming the same intent must share one writer or refuse the claim. Report completion only after verification. Preserve the folder and recovery state across a failed operation or process restart.

Uploads are copies of eligible artifacts. Track the content identity and the resulting link so a retry does not attach another copy. Upload capability is optional for tracking conformance.

## ADR-003 · Guard writes and recovery with per-item revisions

Keep the desired values, last acknowledged item revision, feed cursor and conflict state distinct. Poll even when there is no local work to send. At startup, reconcile from the saved cursor or compare linked items against the last acknowledgements if the cursor is unusable. Close the gap between snapshot and subscription. Persist observations and conflict evidence before advancing the cursor. Match a write AOF initiated to the exact acknowledged revision or recoverable intent. A later revision can arrive before the previous write's response.

Every ordinary write checks its expected revision at the provider. On a stale precondition, reread and classify the change before attempting further work. A conflicting change latches a durable stop that identifies the AOF ref, board ID and conflicting revision. Check it at both the store mutation boundary and workflow dispatch/progression. Keep diagnostics, local documents and the recovery command accessible.

On explicit resync, read the current revision, apply only AOF-managed fields and relations under that revision, and read the item again. Clear the latch only after the expected revision and canonical tracked values are verified together. A concurrent edit or unverifiable response leaves recovery pending. The shared workflow can then check its ordinary readiness rules again.

### Diagram

Show the ordinary guarded write, the poll that detects a competing board edit, and the operator's verified resync. Distinguish the shared local conflict record from the provider revision and the feed cursor.

## ADR-004 · Keep Azure transport and process knowledge in the worked example

Use an opt-in inherited Agile definition and project module. Map milestone to Feature, story to User Story and task to Task. Document the inherited types/states and fields needed for all remaining AOF item types and memberships, including prototype's lifecycle. Verify those mappings on the selected area and project. Setup that changes a process is a separate administrator action.

Acquire the Azure DevOps token via `az` in the executing account, cache it in memory to its reported expiry and refresh as needed. Make HTTP calls in-process and send the personal-account pass-through header. Use WIQL IDs, paged detail batches and link queries for a full read, and the reporting revisions feed at five-second intervals for observation. Guard mutations with a JSON Patch revision test. Keep stable Azure IDs through placement and record per-item progress for partially applied batches. Auth diagnostics, recorded responses and retry evidence must omit tokens.

Check daemon access via the selected definition in the actual daemon environment, reusing the preflight composition at `packages/mesh/src/commands/desktop-preflight.mjs:779`. A failed node reports which sign-in or board-access check failed. A project using files incurs no Azure probe.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-20901 | Provider-specific imports, URLs, auth and command invocations stay in the selected project adapter. Work commands and daemon consumers use the shared store or capability. | `test/arch/work/acd-board-provider-boundary.test.mjs` | ADR-001, ADR-004 |

Register the control in `test/arch/work/index.mjs`. Plant a provider import and a provider-specific call in shared code and record the failing caller and diagnostic in VERIFICATION when the control lands. Exercise the same calls inside the project example as the positive control. Keep the delivered 208/FF-20801 store boundary in force.

## Story boundaries

The local code graph built at 23:37:59 UTC on 24 November 2026 contains 22,712 nodes and 50,170 edges with no extraction egress. The store resolver feeds the work read and write paths, mesh projection, launcher and loop bindings. Select the board at that resolver in story 00. File placement already composes promote, archive, reindex, renumber and scaffold. Story 02 owns their board coordination so those callers keep the shared mutation semantics.

The Azure adapter (01), local publication (02) and daemon probe (04) can each exercise the versioned definition against a fixture after 00. Their common test registration or import-census files appear in the relevant write sets for scheduling. The loop cycle and daemon preflight each have a distinct core binding and an existing owning suite. This places conflict recovery in 03 and the node probe in 04. The golden runner already depends on the file fixture adapter and the public CLI launcher. Story 05 extends its seed/export boundary and consumes the preceding stories.

The derived proposals included transitive readers of the shared assembly, new files with unknown graph coverage and inferred flat test filenames. Story declarations retain the direct collaborators and existing registered suites for each outcome. Story 00 owns the new architecture control. The stories changing pinned imports own the associated bundle census, as identified in milestone 208's retrospective.

The architecture recall (`053e318d-b0b2-4e21-a1f7-506d2d3a68ad`) informed use of the command registry and preservation of the existing loop dispatch and run-record contracts. The product recall (`41c67668-fe28-4167-93f8-c9446b6a8348`) placed the workspace selector and milestone 205 replay at opposite ends of the breakdown.
