---
type: prototype
number: NN
slug: <kebab-slug>
title: "<Prototype Title>"
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
schema: <schema-version>
aofVersion: <aof-version>
---
<!--
  PROTOTYPE.md — the record doc for a prototype: something built fast, inside the work tree, with
  its asks and shortcuts on record. It is a TOP-LEVEL item that is NEVER a driver: nothing may
  depend on it, the loop never offers it, and it is never converted into governed work. It carries
  no stories, tasks, .feature or VERIFICATION, and no `depends:` or `parent:`.
  Status: active ⇄ paused → done | abandoned, and either end reopens to active.
  `aof work prototype` writes the dates, the status moves and the Log; the session writes the prose.
-->
# NN · <Prototype Title>

## Intent

<what this prototype is for — the operator's ask, in one or two sentences>

## Wants

<!-- One dated line per ask, oldest first. A changed or dropped want is struck through, never
     deleted, so the list stays the record of what was asked. -->

- <the first want>

## Shortcuts

<!-- What this prototype deliberately skipped or faked to get something working fast — the list a
     later governed build would have to pay back. Kept current as the build goes. -->

## Diagrams

<!-- Optional. Diagrams drawn for this prototype, each under its own name. -->
