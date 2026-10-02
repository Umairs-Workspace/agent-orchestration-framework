//! Task 00 — trusted `aof` resolution (ARCHITECTURE 36/ADR-004 decision 4).
//!
//! The supervisor resolves the sibling `aof` binary it spawns by an ABSOLUTE,
//! co-located path in its OWN install dir (`$HOME/.aof/bin`, ADR-003) — NEVER a
//! bare-PATH `aof` lookup (the exact hijack vector RESEARCH §4 documents). A
//! dev/unpackaged run (no co-located sibling) falls back per the `mesh-fabric`
//! PATH-first-then-pinned precedent (`src/mesh-fabric.mjs`) rather than crashing.
//!
//! This module returns a RESOLVED path + argv; it never itself calls
//! `std::process::Command::spawn` — the spawn call is `acd-desktop-trusted-spawn`'s
//! surface (feature file comment, task 00), kept in the Tauri shell crate that
//! consumes this resolver.

use std::path::{Path, PathBuf};

use crate::supervision::SupervisedChild;

/// How the `aof` binary to spawn was resolved.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResolutionMode {
    /// The packaged happy path: an absolute path to the sibling binary inside the
    /// supervisor's own install dir. No PATH search at all.
    CoLocated,
    /// The dev/unpackaged fallback: no co-located sibling was found, so resolution
    /// fell back to the `mesh-fabric` PATH-first-then-pinned-absolute idiom.
    PathThenPinnedFallback,
}

/// The resolved `aof` binary: an absolute path plus how it was found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedAof {
    pub path: PathBuf,
    pub mode: ResolutionMode,
}

/// A minimal environment seam so resolution is testable without touching the real
/// process environment — mirrors the fake-clock/fake-`$HOME` seam the story's Build
/// notes call for ("a fake home dir … fed to the resolver").
pub trait ResolveEnv {
    /// The value of `PATH` as a list of directories (already split), most-preferred
    /// first — empty when unset/irrelevant for a test.
    fn path_dirs(&self) -> Vec<PathBuf>;
}

/// A simple `ResolveEnv` fed by explicit fixture values — the seam the `@executable`
/// scenarios drive (Scenario Outline "co-located sibling first / PATH fallback").
#[derive(Debug, Clone, Default)]
pub struct FixtureEnv {
    pub path_dirs: Vec<PathBuf>,
}

impl ResolveEnv for FixtureEnv {
    fn path_dirs(&self) -> Vec<PathBuf> {
        self.path_dirs.clone()
    }
}

/// The platform-specific aof executable filename inside the install dir.
#[cfg(windows)]
fn aof_filename() -> &'static str {
    "aof.exe"
}
#[cfg(not(windows))]
fn aof_filename() -> &'static str {
    "aof"
}

/// Resolve the `aof` binary to spawn.
///
/// `install_dir` is the supervisor's OWN install dir — `$HOME/.aof/bin` in
/// production (ADR-003), an arbitrary fixture dir in tests. `env` supplies the
/// PATH-fallback seam for the dev/unpackaged case.
///
/// CO-LOCATED FIRST: if `install_dir/aof(.exe)` exists, that absolute path is
/// returned with `ResolutionMode::CoLocated` — no PATH search performed at all.
///
/// FALLBACK: if no co-located sibling exists, resolution walks `env.path_dirs()`
/// looking for `aof(.exe)` in each directory (mirroring `mesh-fabric.mjs`'s
/// PATH-first idiom) and returns the FIRST match found, `PathThenPinnedFallback`.
/// If nothing is found anywhere, resolution still does not crash — it returns the
/// bare filename as a LAST-RESORT relative path (degrade, don't crash), still
/// tagged `PathThenPinnedFallback` so callers can surface a "dev mode, aof not
/// found" diagnostic rather than panicking.
pub fn resolve_aof(install_dir: &Path, env: &dyn ResolveEnv) -> ResolvedAof {
    let filename = aof_filename();
    let co_located = install_dir.join(filename);
    if co_located.is_file() {
        return ResolvedAof {
            path: co_located,
            mode: ResolutionMode::CoLocated,
        };
    }

    for dir in env.path_dirs() {
        let candidate = dir.join(filename);
        if candidate.is_file() {
            return ResolvedAof {
                path: candidate,
                mode: ResolutionMode::PathThenPinnedFallback,
            };
        }
    }

    // Degrade, don't crash: no sibling, no PATH match (or an unpopulated env in a
    // pure unit test) — fall back to the bare filename. The caller (the trusted-spawn
    // surface) is responsible for surfacing "aof not found" rather than looping.
    ResolvedAof {
        path: PathBuf::from(filename),
        mode: ResolutionMode::PathThenPinnedFallback,
    }
}

/// True when `path` is located inside `install_dir` (used to assert "the resolved
/// path points inside the supervisor's own install dir").
pub fn is_inside(path: &Path, install_dir: &Path) -> bool {
    path.starts_with(install_dir)
}

/// A shell-less spawn form: a program path plus an argv vector — never a shell
/// command string. `form_spawn` builds this WITHOUT spawning anything (the spawn
/// call itself is the trusted-spawn fitness's surface, owned by the Tauri shell).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpawnForm {
    pub program: PathBuf,
    pub args: Vec<String>,
    /// ONE additive field (126/ADR-006 contract-beat §6): the working directory a
    /// declaration's row carries, so it reaches the spawn without a second form.
    /// `None` for the two seeded daemons, whose spawn is byte-identical to today's.
    pub cwd: Option<PathBuf>,
}

/// Form a shell-less spawn off a resolved aof path plus a plain argv. The ONE place a
/// spawn form is built — program is the resolved absolute path, args stay discrete,
/// and `cwd` is a value rather than something joined into the command line.
pub fn form_argv_spawn(resolved: &ResolvedAof, argv: &[String], cwd: Option<PathBuf>) -> SpawnForm {
    SpawnForm {
        program: resolved.path.clone(),
        args: argv.to_vec(),
        cwd,
    }
}

/// Form the argv for `aof mesh status --json` off a resolved aof path. Shell-less:
/// program is the resolved absolute path, args is a plain vector — never a
/// `cmd`/`sh`/`powershell` wrapper string. Sets no working directory, so the fleet
/// poll's spawn is unmoved.
pub fn form_mesh_status_spawn(resolved: &ResolvedAof) -> SpawnForm {
    form_argv_spawn(
        resolved,
        &["mesh".to_string(), "status".to_string(), "--json".to_string()],
        None,
    )
}

/// Form the spawn for ONE supervised child — the seeded daemons and the supplied
/// declarations alike. A declaration's `cwd` travels here as a value: identity comes
/// from the workspace, not from the launcher (126/ADR-005 §5), and a space in a path is
/// not a shell problem when there is no shell.
pub fn form_child_spawn(resolved: &ResolvedAof, child: &SupervisedChild) -> SpawnForm {
    form_argv_spawn(resolved, &child.argv, child.cwd.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn touch_executable(dir: &Path, name: &str) -> PathBuf {
        let p = dir.join(name);
        fs::write(&p, b"stub").expect("write stub binary");
        p
    }

    // Scenario: the packaged supervisor resolves aof by an absolute path to its
    // co-located sibling.
    #[test]
    fn resolves_co_located_sibling_by_absolute_path_with_no_path_search() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        let expected = touch_executable(&install_dir, aof_filename());

        // A poisoned PATH env that, if consulted, would resolve to a DIFFERENT file —
        // proving no PATH search happened for the co-located case.
        let poisoned_dir = home.path().join("poisoned-path-entry");
        fs::create_dir_all(&poisoned_dir).unwrap();
        touch_executable(&poisoned_dir, aof_filename());
        let env = FixtureEnv { path_dirs: vec![poisoned_dir.clone()] };

        let resolved = resolve_aof(&install_dir, &env);

        assert_eq!(resolved.path, expected, "resolved path is the absolute co-located path");
        assert_eq!(resolved.mode, ResolutionMode::CoLocated, "resolution performed no PATH search");
        assert!(is_inside(&resolved.path, &install_dir), "resolved path is inside the supervisor's own install dir");
    }

    // Scenario: resolution never spawns a bare-PATH "aof" that an earlier PATH entry
    // could hijack.
    #[test]
    fn never_resolves_to_the_earlier_path_hijack_when_co_located_sibling_exists() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        let expected = touch_executable(&install_dir, aof_filename());

        let earlier_path_entry = home.path().join("earlier-on-path");
        fs::create_dir_all(&earlier_path_entry).unwrap();
        let hijack = touch_executable(&earlier_path_entry, aof_filename());

        let env = FixtureEnv { path_dirs: vec![earlier_path_entry.clone()] };
        let resolved = resolve_aof(&install_dir, &env);

        assert_eq!(resolved.path, expected, "the resolved program is the absolute co-located path, not the bare name");
        assert_ne!(resolved.path, hijack, "the earlier PATH aof.exe is not the resolved target");
    }

    // Scenario: the spawn is a shell-less argv, never routed through a shell
    // interpreter.
    #[test]
    fn forms_a_shell_less_argv_for_mesh_status() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        let expected = touch_executable(&install_dir, aof_filename());
        let env = FixtureEnv::default();

        let resolved = resolve_aof(&install_dir, &env);
        let spawn = form_mesh_status_spawn(&resolved);

        assert_eq!(spawn.program, expected, "the spawn program is the resolved absolute aof path");
        assert_eq!(
            spawn.args,
            vec!["mesh".to_string(), "status".to_string(), "--json".to_string()],
            "the arguments are the argv vector [mesh, status, --json]"
        );
        // Shell-less: the program is never one of the shell interpreters, and args
        // never collapse into a single joined command string.
        let program_str = spawn.program.to_string_lossy().to_lowercase();
        for shell in ["cmd", "cmd.exe", "sh", "bash", "powershell", "powershell.exe", "pwsh"] {
            assert!(
                !program_str.ends_with(shell),
                "the spawn is not wrapped in a {shell} shell string"
            );
        }
        assert_eq!(spawn.args.len(), 3, "argv stays a vector of discrete arguments, not one joined string");
    }

    // Scenario Outline: resolution chooses the co-located sibling first and the PATH
    // fallback only when no sibling exists.
    #[test]
    fn resolution_mode_is_co_located_when_sibling_present() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        touch_executable(&install_dir, aof_filename());
        let env = FixtureEnv::default();

        let resolved = resolve_aof(&install_dir, &env);

        assert_eq!(resolved.mode, ResolutionMode::CoLocated, "mode is \"co-located absolute path\"");
    }

    #[test]
    fn resolution_mode_is_path_then_pinned_fallback_when_sibling_absent_dev_run() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap(); // install dir exists, but empty — a dev/unpackaged run

        let path_dir = home.path().join("some-path-dir");
        fs::create_dir_all(&path_dir).unwrap();
        touch_executable(&path_dir, aof_filename());
        let env = FixtureEnv { path_dirs: vec![path_dir] };

        let resolved = resolve_aof(&install_dir, &env);

        assert_eq!(resolved.mode, ResolutionMode::PathThenPinnedFallback, "mode is \"PATH-then-pinned fallback (dev run)\"");
    }

    #[test]
    fn resolution_never_crashes_even_when_nothing_is_found_anywhere() {
        let home = TempDir::new().unwrap();
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        let env = FixtureEnv::default(); // no PATH dirs at all, no co-located sibling

        // The point of the assertion: this call returns instead of panicking.
        let resolved = resolve_aof(&install_dir, &env);

        assert_eq!(resolved.mode, ResolutionMode::PathThenPinnedFallback, "resolution does not crash — it degrades to the fallback mode");
        let spawn = form_mesh_status_spawn(&resolved);
        assert!(!spawn.program.as_os_str().is_empty(), "whichever program is chosen, it is non-empty");
    }

    // ── 126/03 task 02 — Scenario Outline: the spawn form a child produces. The
    // program is always the resolved absolute co-located `aof`; the arguments stay
    // discrete strings, unquoted and unjoined; the working directory is the child's own.

    fn resolved_in_a_real_install_dir(home: &TempDir) -> (ResolvedAof, PathBuf) {
        let install_dir = home.path().join(".aof").join("bin");
        fs::create_dir_all(&install_dir).unwrap();
        let expected = touch_executable(&install_dir, aof_filename());
        (resolve_aof(&install_dir, &FixtureEnv::default()), expected)
    }

    fn child(id: &str, argv: &[&str], cwd: Option<&str>) -> SupervisedChild {
        SupervisedChild {
            id: id.to_string(),
            label: format!("aof {}", argv.join(" ")),
            argv: argv.iter().map(|a| a.to_string()).collect(),
            cwd: cwd.map(PathBuf::from),
        }
    }

    #[test]
    fn the_spawn_form_a_child_produces() {
        let home = TempDir::new().unwrap();
        let (resolved, expected_program) = resolved_in_a_real_install_dir(&home);

        let cases: Vec<(&str, SupervisedChild, Option<PathBuf>)> = vec![
            // The seeded daemons, whose spawn is unchanged — no working directory set,
            // exactly as today.
            ("the mesh server", SupervisedChild::mesh_serve(), None),
            ("the mesh web UI", SupervisedChild::mesh_ui(), None),
            // Declaration rows.
            (
                "a declaration in this repo",
                child("a", &["work", "loop", "124", "--level", "L2", "--resume"], Some("C:/Source/umami/aof")),
                Some(PathBuf::from("C:/Source/umami/aof")),
            ),
            (
                "a declaration whose path has a space in it",
                child("b", &["work", "loop", "126", "--level", "L3", "--resume"], Some("C:/Source/Umami User/my project")),
                Some(PathBuf::from("C:/Source/Umami User/my project")),
            ),
            (
                "a declaration in a worktree",
                child(
                    "c",
                    &["work", "loop", "126/03", "--level", "L2", "--resume"],
                    Some("C:/Source/umami/aof/.aof/worktrees/126-03"),
                ),
                Some(PathBuf::from("C:/Source/umami/aof/.aof/worktrees/126-03")),
            ),
        ];

        for (why, spec, expected_cwd) in cases {
            let form = form_child_spawn(&resolved, &spec);

            assert_eq!(form.program, expected_program, "the program is the resolved absolute co-located aof path — {why}");
            assert_eq!(form.args, spec.argv, "the arguments are that argv as discrete strings — {why}");
            assert_eq!(form.args.len(), spec.argv.len(), "unquoted and unjoined — {why}");
            assert_eq!(form.cwd, expected_cwd, "the working directory is the child's own — {why}");

            // Shell-less, for a declaration exactly as for a daemon.
            let program_str = form.program.to_string_lossy().to_lowercase();
            for shell in ["cmd", "cmd.exe", "sh", "bash", "powershell", "powershell.exe", "pwsh"] {
                assert!(!program_str.ends_with(shell), "the spawn is not wrapped in a {shell} shell string — {why}");
            }
            assert!(
                form.args.iter().all(|arg| !arg.contains('"')),
                "a path is a value, not a command line — nothing is quoted as though a shell would read it ({why})"
            );
        }
    }

    #[test]
    fn the_fleet_polls_spawn_form_is_unmoved_and_sets_no_working_directory() {
        let home = TempDir::new().unwrap();
        let (resolved, expected_program) = resolved_in_a_real_install_dir(&home);

        let form = form_mesh_status_spawn(&resolved);
        assert_eq!(form.program, expected_program);
        assert_eq!(form.args, vec!["mesh".to_string(), "status".to_string(), "--json".to_string()]);
        assert_eq!(form.cwd, None, "the existing spawn is byte-identical — the trusted-spawn surface is unmoved");
    }
}
