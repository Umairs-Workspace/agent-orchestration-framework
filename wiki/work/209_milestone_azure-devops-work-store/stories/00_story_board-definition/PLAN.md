# 209/00 · Board selection

## Mechanism

Keep workspace binding synchronous. Let the first store operation validate the selected manifest and load its explicitly named module. Resolve the manifest from the project root and the module from the manifest directory. Check both real paths before import. Validate callable bindings after import and before dispatch.

Use the existing workspace-scoped store lifetime and adapt the high-level replies to its snapshot, observation and mutation interfaces. The same adapter can expose only the three required operations.

## Verification step

Run public work reads against a temporary checkout with its own module and then against a file-only checkout. Use distinct titles at the same ref and an import/call log to detect accidental fallback, eager loading and cross-workspace reuse.

Register FF-20901 in the architecture runner. Temporarily introduce a provider import and a provider-specific call in shared code, observe each diagnostic, then restore the source. Exercise the allowed project adapter as the positive control and record the observed failures at verification.

## Out of scope

Story 01 supplies the Azure module. Story 02 coordinates publication and durable links. Story 04 exercises the daemon probe in the daemon account.
