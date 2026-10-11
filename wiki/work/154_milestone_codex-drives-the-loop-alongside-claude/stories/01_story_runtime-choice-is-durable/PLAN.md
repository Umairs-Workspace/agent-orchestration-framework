# 154/01 · Runtime and model choices survive resume — build plan

Advisory to the builder; the task features are the acceptance contract.

## Mechanism

Extend the existing phase/role resolver with runtime-scoped inputs and one precedence owner. Persist a versioned additive execution envelope before launch; callers consume it rather than re-resolving a warm run. Distinguish absent legacy metadata from a malformed new envelope.

## Verification step

Round-trip declaration and run serialization, change config, and resolve resume. Assert runtime/model/effort provenance and refusal of conflicts, then exercise existing legacy resolver cases. Land FF-15402 with a red probe.

## Out of scope

CLI propagation and worker negotiation are integration responsibilities; no model aliases are invented.

