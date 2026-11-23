# 00 · Build brief

## Mechanism

Resolve the configured provider per workspace. Give the file implementation the existing enumerator, record loader and change observer. Expose a snapshot with logical refs, metadata and document-home information, and bind the suite to the ordinary runner.

## Verification

Run a workspace with no setting and another with explicit files. Exercise public selection with a bad value and inject a small store with no tracking directory. Compare the returned fields and ensure closing one workspace leaves the other usable.

The delivery uses the file provider. Live integration with an external tracker belongs to milestone 209.
