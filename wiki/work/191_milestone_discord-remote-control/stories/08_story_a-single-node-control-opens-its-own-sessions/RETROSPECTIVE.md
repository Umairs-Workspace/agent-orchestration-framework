---
type: story
doc: retrospective
number: 08
parent: 191
slug: a-single-node-control-opens-its-own-sessions
title: "Retrospective — a single-node control opens its own sessions"
created: 2026-11-15
updated: 2026-11-15
promotionFrom: 1
---
# 191/08 · Retrospective

These are the lessons from delivering and accepting the story, one `R<n>` per lesson. Findings are referenced here, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — The repair written into a finding would itself have broken the machine

- **Kind:** near-miss · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** the architect, at the F-03 amendment · **Promoted to:** none

**What happened.** F-03's triage proposed giving the single-node control a `mesh.relay.url`. The
architect read the source before amending ADR-001. With `mesh.address: 127.0.0.1`, the stream server
takes its port from the same URL and the relay binds the same port, so the relay would never start.
The amendment derived a relay on 4183 instead.

**Why.** The triage wrote a plausible repair from the symptom, without reading what else reads the
same key.

**Lesson.** A repair written at triage is a hypothesis. The architect measures it at source before
the operator is asked to ratify it, and the ratification names the measured design, not the
triage's guess.

**Refs:** 191/F-03 · ADR-001 amendment (2026-11-14) §3 · FF-19109

## R2 — A changed default started a listener in six suites, and none of them failed

- **Kind:** near-miss · **Area:** process (testing) · **Stage:** build · **Owner:** developer · **Raised by:** the 191/08 build's port guard · **Promoted to:** none

**What happened.** Deriving a relay for every nominated control made six launcher suites start a
broker on the fixed port 4183. They all passed. On this laptop they would have bound a live port,
and under sharding they would have collided. A port guard the developer ran refused 60 binds.

**Why.** A test that starts a nominated control had always been safe, because no relay was built
without a URL. The default changed under them.

**Lesson.** A change that makes a default start a listener is built under a guard that refuses the
live ports, and every suite that constructs that component is swept for the new bind.

**Refs:** 191/F-09 · 191/F-12
