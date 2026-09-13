//! Task 01 (continued) — the poll cadence: `mesh status --json` is the supervisor's
//! ONLY fleet-data command, re-issued once per cadence tick (ARCHITECTURE 36/ADR-004
//! d1-2, DESIGN §Footer poll idiom).
//!
//! The cadence is driven off an injectable tick source — never a real `sleep`-driven
//! loop in a unit test (the story's Build notes: "asserted as one status invocation
//! per tick over a fake clock/timer seam"). The REAL spawn (a `std::process::Command`
//! over the resolved path from `resolve.rs`) lives in the Tauri shell crate that
//! consumes this seam; this module models "what happens on tick" as a plain
//! trait/closure so it is pure-function testable.

/// How many cadence ticks apart the declarations answer is asked for (126/ADR-005 §2):
/// every tenth tick of the 3 s `POLL_INTERVAL`, i.e. 30 s. ONE loop and ONE interval —
/// the flag rides an existing tick rather than a second cadence (36/ADR-004), and the
/// fleet view keeps its 3 s refresh while the reconcile costs 167 ms / 30 s.
pub const DECLARATIONS_EVERY_NTH_TICK: u32 = 10;

/// Whether the poll on `tick` (1-indexed) also carries `--declarations`. A supervisor
/// that has not ticked has reconciled nothing, and the flag does not stick to every
/// later tick.
pub fn poll_carries_declarations(tick: u32) -> bool {
    tick > 0 && tick % DECLARATIONS_EVERY_NTH_TICK == 0
}

/// A single fleet-data command issuance, as observed by a fake spawner — the
/// object under test for "the poll's ONLY fleet-data command is mesh status --json".
/// It records the argv AND the tick it rode on, so "which ticks were flagged" is
/// observable rather than merely counted.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FleetDataCommand {
    pub argv: Vec<String>,
    pub tick: u32,
}

impl FleetDataCommand {
    pub fn mesh_status_json(tick: u32) -> Self {
        FleetDataCommand {
            argv: vec!["mesh".to_string(), "status".to_string(), "--json".to_string()],
            tick,
        }
    }

    /// The SAME command with one flag added — never a second data-bearing verb, which
    /// is what keeps `acd-desktop-single-data-path` satisfied without an edit
    /// (126/ADR-005 §1).
    pub fn mesh_status_json_with_declarations(tick: u32) -> Self {
        let mut cmd = FleetDataCommand::mesh_status_json(tick);
        cmd.argv.push("--declarations".to_string());
        cmd
    }

    /// The one command this tick issues.
    pub fn for_tick(tick: u32) -> Self {
        if poll_carries_declarations(tick) {
            FleetDataCommand::mesh_status_json_with_declarations(tick)
        } else {
            FleetDataCommand::mesh_status_json(tick)
        }
    }

    /// Whether this issuance carried the declarations flag.
    pub fn carries_declarations(&self) -> bool {
        self.argv.iter().any(|arg| arg == "--declarations")
    }
}

/// The seam a poller drives its fleet-data reads through. A real implementation
/// spawns the resolved `aof` (task 00) and returns its stdout; a test implementation
/// records the argv it was asked to issue.
pub trait FleetDataSource {
    /// Issue ONE fleet-data poll for the given 1-indexed cadence `tick`, recording the
    /// command that was used to obtain it and returning the raw status document text
    /// (or an error) for the caller to parse via `status::parse_status`.
    fn poll_once(&mut self, tick: u32) -> FleetDataCommand;
}

/// A recording fake source — captures every command issued so a test can assert
/// "only `mesh status --json`, N times."
#[derive(Debug, Default)]
pub struct RecordingFleetDataSource {
    pub issued: Vec<FleetDataCommand>,
}

impl FleetDataSource for RecordingFleetDataSource {
    fn poll_once(&mut self, tick: u32) -> FleetDataCommand {
        let cmd = FleetDataCommand::for_tick(tick);
        self.issued.push(cmd.clone());
        cmd
    }
}

/// Drive `source` for `ticks` cadence ticks, issuing exactly one fleet-data poll per
/// tick. This is the pure cadence model the `@executable` scenario exercises — a
/// real timer (e.g. a `tokio::time::interval`) in the Tauri shell calls this same
/// per-tick step; nothing here sleeps.
pub fn run_cadence(source: &mut dyn FleetDataSource, ticks: u32) {
    for tick in 1..=ticks {
        source.poll_once(tick);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Scenario: the poll's ONLY fleet-data command is mesh status --json.
    #[test]
    fn the_only_fleet_data_command_issued_is_mesh_status_json() {
        let mut source = RecordingFleetDataSource::default();
        run_cadence(&mut source, 1);

        assert_eq!(source.issued.len(), 1);
        assert_eq!(source.issued[0].argv, vec!["mesh", "status", "--json"], "the only fleet-data command issued is \"mesh status --json\"");
        // This fake source's only producible value is `mesh_status_json()` — there is
        // structurally no OTHER fleet-data argv it could have recorded (no second
        // data-bearing command exists to issue), the same single-data-path guarantee
        // acd-desktop-single-data-path enforces over the real spawn source.
        assert!(
            source.issued.iter().all(|cmd| cmd.argv == vec!["mesh", "status", "--json"]),
            "every issued command is the single fleet-data command"
        );
    }

    // Scenario: the poll re-issues mesh status --json once per cadence tick.
    #[test]
    fn three_cadence_ticks_issue_exactly_three_status_invocations() {
        let mut source = RecordingFleetDataSource::default();
        run_cadence(&mut source, 3);

        assert_eq!(source.issued.len(), 3, "\"mesh status --json\" is invoked exactly three times");
        assert!(
            source.issued.iter().all(|c| c.argv == vec!["mesh", "status", "--json"]),
            "each tick issues exactly one status invocation"
        );
    }

    // ── 126/03 task 02 — Scenario Outline: how many of a run's polls carry the
    // declarations flag. ONE interval, ONE command, the flag on every tenth tick.

    #[test]
    fn how_many_of_a_runs_polls_carry_the_declarations_flag() {
        // | ticks | polls | flagged | which      |
        let cases: Vec<(u32, usize, usize, Vec<u32>)> = vec![
            (0, 0, 0, vec![]),
            (1, 1, 0, vec![]),
            (9, 9, 0, vec![]),
            (10, 10, 1, vec![10]),
            (11, 11, 1, vec![10]),
            (20, 20, 2, vec![10, 20]),
            (30, 30, 3, vec![10, 20, 30]),
        ];

        for (ticks, polls, flagged, which) in cases {
            let mut source = RecordingFleetDataSource::default();
            run_cadence(&mut source, ticks);

            assert_eq!(source.issued.len(), polls, "{ticks} ticks issue {polls} polls");
            assert!(
                source.issued.iter().all(|c| c.argv[..3] == ["mesh", "status", "--json"]),
                "every poll is the SAME mesh status --json command and no other fleet-data command"
            );
            let flagged_ticks: Vec<u32> = source
                .issued
                .iter()
                .filter(|c| c.carries_declarations())
                .map(|c| c.tick)
                .collect();
            assert_eq!(flagged_ticks.len(), flagged, "{flagged} of {ticks} ticks carry --declarations");
            assert_eq!(flagged_ticks, which, "the flagged ticks are {which:?}");
        }
    }

    #[test]
    fn the_flagged_poll_adds_one_flag_to_the_same_command_never_a_second_verb() {
        let flagged = FleetDataCommand::for_tick(10);
        assert!(flagged.carries_declarations());
        assert_eq!(
            flagged.argv,
            vec!["mesh", "status", "--json", "--declarations"],
            "one flag on the one admitted verb, not a second data-bearing command"
        );
        assert_eq!(
            FleetDataCommand::for_tick(9).argv,
            vec!["mesh", "status", "--json"],
            "an unflagged tick issues today's command byte for byte"
        );
    }
}
