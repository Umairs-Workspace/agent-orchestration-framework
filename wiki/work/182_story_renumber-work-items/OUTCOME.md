# 182 · Renumber work items — Outcome

## Delivered

### Explicit renumbering
A live numbered item can move to a vacant number through aof work renumber, with a read-only preview, unchanged lifecycle status and no sibling shifts.

### Reference and memory continuity
Current work-document references and linked stream stores receive the new identity; the configured memory corpus is rebuilt. Dated migration history lets recall accounting join original observations to moved lessons while allowing later reuse of a number.

### Observable recovery
Held items and invalid destinations are refused before mutation. Ordinary document-write failures roll back, and a post-move memory failure returns the successful move with a nonzero exit and a recovery command.
