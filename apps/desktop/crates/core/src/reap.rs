//! The reap ladder (milestone 175 / ADR-001 §2-§3): what the supervisor signals, and when, to
//! take every supervised process group down at exit off Windows.
//!
//! On Windows the Job Object reaps the tree when its handle closes. Off Windows nothing does,
//! so the exit carries out this plan: SIGTERM each live group, wait up to the grace for them to
//! go, then SIGKILL whichever survive. A group is named by its leader's pid, because every
//! supervised child is spawned leading its own group (§1).
//!
//! The plan is pure: it is stepped with the time since it started and a liveness answer, and
//! it says what to do next. The shell (`crates/app`) only maps a step onto `killpg` and a
//! sleep. After a `TERM` step the shell watches the groups and asks again once the last one is
//! gone or the grace has run out, whichever comes first. A `KILL` is only ever reached through
//! a `WaitUntil` the grace's end, so however early the shell asks, no group is sent SIGKILL
//! inside its grace.

use std::fmt;

/// The grace between a group's SIGTERM and its SIGKILL (ADR-001 §2, 175/00 Q1).
pub const REAP_GRACE_MS: u64 = 5_000;

/// The two signals the supervisor sends a group.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Signal {
    Term,
    Kill,
}

/// One signal to one whole process group, named by its leader's pid.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GroupSignal {
    pub group: u32,
    pub signal: Signal,
}

impl fmt::Display for GroupSignal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let signal = match self.signal {
            Signal::Term => "TERM",
            Signal::Kill => "KILL",
        };
        write!(f, "{signal} group {}", self.group)
    }
}

/// The stop ladder's last rung for a child that leads its own group (ADR-001 §3): SIGKILL to
/// the group, never to the bare pid, so the loop's own children go with it.
pub fn last_rung_kill(leader_pid: u32) -> GroupSignal {
    GroupSignal { group: leader_pid, signal: Signal::Kill }
}

/// What the shell does next.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReapStep {
    /// SIGTERM each of these groups.
    Term(Vec<u32>),
    /// Do nothing until this many milliseconds after the plan started.
    WaitUntil(u64),
    /// SIGKILL each of these groups.
    Kill(Vec<u32>),
    /// Every group is gone, or has been sent SIGKILL.
    Done,
}

impl fmt::Display for ReapStep {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let signals = |f: &mut fmt::Formatter<'_>, word: &str, groups: &[u32]| {
            let parts: Vec<String> = groups.iter().map(|g| format!("{word} {g}")).collect();
            write!(f, "{}", parts.join(", "))
        };
        match self {
            ReapStep::Term(groups) => signals(f, "TERM", groups),
            ReapStep::Kill(groups) => signals(f, "KILL", groups),
            ReapStep::WaitUntil(ms) if ms % 1_000 == 0 => write!(f, "wait until {} s", ms / 1_000),
            ReapStep::WaitUntil(ms) => write!(f, "wait until {ms} ms"),
            ReapStep::Done => write!(f, "done"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Phase {
    Start,
    Termed(Vec<u32>),
    Waited(Vec<u32>),
    Finished,
}

/// The reap of a set of groups, stepped to its end.
#[derive(Debug, Clone)]
pub struct ReapPlan {
    groups: Vec<u32>,
    grace_ms: u64,
    phase: Phase,
}

impl ReapPlan {
    /// A plan over the groups recorded at exit. Order is kept and duplicates are dropped, so the
    /// signals go out in the order the children were spawned.
    pub fn new(groups: impl IntoIterator<Item = u32>, grace_ms: u64) -> Self {
        let mut seen = Vec::new();
        for group in groups {
            if !seen.contains(&group) {
                seen.push(group);
            }
        }
        ReapPlan { groups: seen, grace_ms, phase: Phase::Start }
    }

    /// The next step, given the milliseconds since the plan started and whether a group still
    /// has a live member. A group already gone is never signalled, and SIGKILL is only ever
    /// asked for once the grace has run out.
    pub fn step(&mut self, elapsed_ms: u64, alive: impl Fn(u32) -> bool) -> ReapStep {
        match &self.phase {
            Phase::Start => {
                let live: Vec<u32> = self.groups.iter().copied().filter(|g| alive(*g)).collect();
                if live.is_empty() {
                    self.phase = Phase::Finished;
                    return ReapStep::Done;
                }
                self.phase = Phase::Termed(live.clone());
                ReapStep::Term(live)
            }
            Phase::Termed(termed) => {
                let survivors: Vec<u32> = termed.iter().copied().filter(|g| alive(*g)).collect();
                if survivors.is_empty() {
                    self.phase = Phase::Finished;
                    return ReapStep::Done;
                }
                self.phase = Phase::Waited(survivors);
                ReapStep::WaitUntil(self.grace_ms)
            }
            Phase::Waited(waited) => {
                let survivors: Vec<u32> = waited.iter().copied().filter(|g| alive(*g)).collect();
                if survivors.is_empty() {
                    self.phase = Phase::Finished;
                    ReapStep::Done
                } else if elapsed_ms < self.grace_ms {
                    ReapStep::WaitUntil(self.grace_ms)
                } else {
                    self.phase = Phase::Finished;
                    ReapStep::Kill(survivors)
                }
            }
            Phase::Finished => ReapStep::Done,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::supervision::{stop_step, StopStep, STOP_GRACE_MS};
    use std::collections::HashMap;

    /// Step a plan the way the shell does: after a TERM it watches the groups and asks again
    /// once the last one has gone or the grace has run out; after a WaitUntil it sleeps to it.
    /// The record is every step the plan answered, in order.
    /// `exits` holds each group's exit time after its SIGTERM; a group absent from it never
    /// exits on SIGTERM, and a group whose time is `None` was gone before the reap began.
    fn run(groups: &[u32], grace_ms: u64, exits: &[(u32, Option<u64>)]) -> Vec<String> {
        let exits: HashMap<u32, Option<u64>> = exits.iter().copied().collect();
        let alive_at = |g: u32, now: u64| match exits.get(&g) {
            Some(None) => false,
            Some(Some(at)) => now < *at,
            None => true,
        };
        let mut plan = ReapPlan::new(groups.iter().copied(), grace_ms);
        let mut now = 0;
        let mut steps = Vec::new();
        for _ in 0..10 {
            let step = plan.step(now, |g| alive_at(g, now));
            steps.push(step.to_string());
            match step {
                ReapStep::Term(termed) => {
                    let last_exit = termed.iter().map(|g| exits.get(g).copied().flatten().unwrap_or(u64::MAX)).max();
                    now = last_exit.unwrap_or(0).min(grace_ms);
                }
                ReapStep::WaitUntil(until) => now = now.max(until),
                ReapStep::Kill(_) => {}
                ReapStep::Done => return steps,
            }
        }
        panic!("the plan never finished: {steps:?}");
    }

    // Scenario: E1 · groups that exit on SIGTERM are never sent SIGKILL
    #[test]
    fn e1_groups_that_exit_on_sigterm_are_never_sent_sigkill() {
        let steps = run(&[4101, 4102], 5_000, &[(4101, Some(1_000)), (4102, Some(1_000))]);
        assert_eq!(steps, ["TERM 4101, TERM 4102", "done"]);
        assert!(steps.iter().all(|s| !s.contains("KILL")), "no step names KILL");
    }

    // Scenario: E2 · a group still alive after the grace is sent SIGKILL, and a gone one is not
    #[test]
    fn e2_a_group_alive_after_the_grace_is_killed_and_a_gone_one_is_not() {
        let steps = run(&[4101, 4102], 5_000, &[(4102, Some(1_000))]);
        assert_eq!(steps, ["TERM 4101, TERM 4102", "wait until 5 s", "KILL 4101", "done"]);
    }

    // Scenario: E3 · a declaration's group is reaped with the daemons
    #[test]
    fn e3_a_declarations_group_is_reaped_with_the_daemons() {
        let steps = run(&[4101, 4102, 4210], 5_000, &[(4101, Some(500)), (4102, Some(500)), (4210, Some(500))]);
        assert_eq!(steps[0], "TERM 4101, TERM 4102, TERM 4210");
    }

    // Scenario: E7 · the stop ladder's last rung names the group, not the pid
    #[test]
    fn e7_the_stop_ladders_last_rung_names_the_group() {
        assert_eq!(stop_step(2, Some(STOP_GRACE_MS), STOP_GRACE_MS, false), StopStep::Kill);
        assert_eq!(last_rung_kill(4210).to_string(), "KILL group 4210");
        assert_eq!(last_rung_kill(4210), GroupSignal { group: 4210, signal: Signal::Kill });
    }

    // Scenario Outline: the plan over each starting state
    #[test]
    fn the_plan_over_each_starting_state() {
        let rows: [(&[u32], &[u32], &[&str]); 4] = [
            (&[], &[], &["done"]),
            (&[4101], &[], &["TERM 4101", "done"]),
            (&[4101], &[4101], &["TERM 4101", "wait until 5 s", "KILL 4101", "done"]),
            (
                &[4101, 4102],
                &[4101, 4102],
                &["TERM 4101, TERM 4102", "wait until 5 s", "KILL 4101, KILL 4102", "done"],
            ),
        ];
        for (groups, alive, expected) in rows {
            // A group not alive when the grace ends exits on its SIGTERM; one that is never exits.
            let exits: Vec<(u32, Option<u64>)> =
                groups.iter().filter(|g| !alive.contains(g)).map(|g| (*g, Some(1_000))).collect();
            assert_eq!(run(groups, 5_000, &exits), expected, "groups {groups:?}, alive {alive:?}");
        }
    }

    // Scenario: a group already gone before the reap is not signalled at all
    #[test]
    fn a_group_already_gone_before_the_reap_is_not_signalled() {
        let steps = run(&[4101, 4102], 5_000, &[(4101, None), (4102, Some(1_000))]);
        assert_eq!(steps, ["TERM 4102", "done"]);
        assert!(steps.iter().all(|s| !s.contains("4101")), "no step names 4101");
        assert_eq!(run(&[4101], 5_000, &[(4101, None)]), ["done"]);
    }

    /// A KILL never arrives inside the grace, however early the shell asks.
    #[test]
    fn a_kill_never_arrives_inside_the_grace() {
        let mut plan = ReapPlan::new([4101], 5_000);
        assert_eq!(plan.step(0, |_| true), ReapStep::Term(vec![4101]));
        for at in [0, 1, 2_500, 4_999] {
            assert_eq!(plan.step(at, |_| true), ReapStep::WaitUntil(5_000), "asked at {at} ms");
        }
        assert_eq!(plan.step(5_000, |_| true), ReapStep::Kill(vec![4101]));
        assert_eq!(plan.step(6_000, |_| true), ReapStep::Done, "a finished plan stays finished");
    }

    /// The grace is the named constant ADR-001 §2 fixes, and a duplicate group is signalled once.
    #[test]
    fn the_grace_is_five_seconds_and_a_group_is_signalled_once() {
        assert_eq!(REAP_GRACE_MS, 5_000);
        let mut plan = ReapPlan::new([4101, 4101, 4102], REAP_GRACE_MS);
        assert_eq!(plan.step(0, |_| true), ReapStep::Term(vec![4101, 4102]));
    }
}
