# 192/03 · A project sees its practices and hears of a stale render — build plan

## Mechanism

Three small things hang off the answer 192/00 already computes: which declared practices are on
for the project's config.

The update returns that answer as `practices`, with each practice's title, summary and keys, and
its face prints it as one block. Follow the test-layout warning that the same face already
prints: a field on the result, a small function that turns it into lines, and the same field in
the JSON. The list is printed on a dry run too, because it only reads.

Init and update write the same answer into the install manifest, as one boolean per practice id.
The manifest's `work` section is built by picking fields, never by spreading, so the new field
is one more picked field in both doors.

The doctor lane is a pure function of three facts: the record, the current answer, and each
practice's keys and targets. Core reads them at the doctor command's edge and hands them to the
engine as data, the way the daemon's cost snapshots arrive; the engine passes them to the lanes
untouched and names no practice. When the facts are absent the lane says nothing, so the other
callers of the engine are unchanged. The lane is appended through the engine's extension seam,
beside the examples lane, and anchors its findings at the work directory so scope never filters
them.

## Verification step

In a scratch project initialised from the shipped bundle: run the update and read the list as an
operator would. Set `work.examples.enabled` to `true` and run the doctor without updating: one
error, naming the key and four artefacts, ending with the command. Update, and it is gone.
Remove the key, doctor again: one warning. Then delete `practices` from the lock by hand: one
warning of the other code, and no stale finding. Finally run the update and the doctor in this
checkout: the list shows both practices on, and the doctor reports neither code.

A wrong build shows as a finding that survives the update, as two findings for one practice, as
a finding repeated per item when the doctor is scoped, or as a list that says on where the
rendered command holds no beat.

## Out of scope

- A check in the project doctor — ADR-006 §4 places it in the work doctor.
- A verb that turns a practice on — the list names the key; `init-config` flags are each
  practice's own (193 adds one).
- Telling a project about a practice at init — it renders before a config exists.
- Blocking the status door on a stale render — the lane speaks when the doctor command asks.

## Known traps

- A record that lacks a practice the bundle declares means "rendered off", not "unrecorded".
  Only a `work` section with no `practices` at all is unrecorded.
- The record must be the answer the render used, taken from the same call. Computing it a second
  time after the config may have been migrated by the same update can disagree with the render.
- The doctor's config may be merged with the machine's. The lane needs the project's own file,
  read the way the update reads it.
- This checkout's lock gains its record only when the update is run here with this tree's own
  CLI entry and the result is committed.
