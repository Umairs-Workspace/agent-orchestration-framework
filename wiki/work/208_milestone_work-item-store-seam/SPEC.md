---
type: milestone
number: 208
slug: work-item-store-seam
title: "Work items are read and written through one store interface, with today's files as its first store"
status: not-started
owner: product-owner
created: 2026-11-20
updated: 2026-11-20
depends: [205]
schema: 1
aofVersion: 0.1.0
---
# 208 · Work items are read and written through one store interface, with today's files as its first store

## Objective

The file layout is the data model of the work stream today:

| Concept | Where it lives |
|---|---|
| Identity and order | The folder name `NN_type_slug` (`@aof/work/identity`) |
| Status | Frontmatter in the record doc. `setItemStatus(..., { expectFrom })` is a guarded file write |
| Hierarchy | Folder nesting |
| Dependencies | `depends:` frontmatter |
| Change detection | `fs.watch` and stat digests (`@aof/work/discovery`, used by the mesh publisher and launcher) |

That leaves no place to put another tracker, such as Azure DevOps. This milestone puts one
interface, a `WorkItemStore`, in front of item tracking: identity, title, status, parent,
dependencies and order. Today's code becomes its file store.

The documents stay in the repo whatever the store: SPEC, ADRs, `.feature` contracts and
VERIFICATION. Agents edit them, tests trace to them and the frozen set protects them. The folder
remains each item's document home.

It is met when every reader and writer of item tracking goes through the interface, behaviour is
unchanged (the 205 baselines diff empty), and a fitness function stops new code
from reaching around it.

## Scope

In scope:
- **The interface.** Listing, lookup by ref, reading item metadata, guarded status writes,
  dependency reads and change notification, in a shape that does not assume files.
- **The file store.** Today's `discovery`, `records` and `read` code, behind the interface,
  unchanged in behaviour.
- **Routing every consumer through it.** At capture these were:
  - core's work bindings;
  - the global work store;
  - the work reader;
  - the mesh publisher and launcher.
- **Change notification.** File watches stay the file store's own mechanism. The interface allows
  a store that polls.
- **A fitness function.** Nothing outside the file store imports the file layer for item tracking.
- **Store selection.** A config key that picks the store, defaulting to files, so existing projects
  change nothing.

Out of scope:
- Any store other than files. Azure DevOps is 209.
- Moving the documents out of the repo.
- Changing the command prose. It already changes status only through verbs (`aof work status`,
  `promote`, `run-start`/`run-complete`, `archive`) and forbids hand-editing `status:`.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- **205.** Its baselines are this milestone's proof that nothing changed.
