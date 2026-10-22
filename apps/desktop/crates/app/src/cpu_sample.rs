// Milestone 167 · story 05 (ADR-006) — the guard's OS sample: a supervised daemon's cumulative CPU
// time, read from the operating system by its process id rather than from the daemon's own
// snapshot, because a daemon busy enough to matter may have stopped reporting on itself.
//
// The judgement is not here — it is `mesh_desktop_core::guard`, pure and `cargo test`-covered.
// This only reads a number. Grandchildren are not counted (ADR-002): the `git` children a daemon
// spawns are the work the operator asked for. On a platform with no sampler the reading is `None`,
// and the guard judges nothing.

/// The guard's one OS seam.
pub trait CpuSampler: Send + Sync {
    /// The process's cumulative user + kernel CPU time in 100 ns units, or `None` when it cannot
    /// be read (gone, or no access).
    fn cpu_time_100ns(&self, pid: u32) -> Option<u64>;
}

/// The real sampler: `GetProcessTimes` on Windows, nothing elsewhere (SPEC: the control node first).
pub struct OsCpuSampler;

#[cfg(windows)]
impl CpuSampler for OsCpuSampler {
    fn cpu_time_100ns(&self, pid: u32) -> Option<u64> {
        use windows_sys::Win32::Foundation::{CloseHandle, FILETIME};
        use windows_sys::Win32::System::Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        let ticks = |time: FILETIME| ((time.dwHighDateTime as u64) << 32) | time.dwLowDateTime as u64;
        // SAFETY: the handle is opened read-only (query-limited), checked for null, used only for
        // the one call, and closed on every path; the four FILETIMEs are owned locals.
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if handle.is_null() {
                return None;
            }
            let zero = FILETIME { dwLowDateTime: 0, dwHighDateTime: 0 };
            let (mut created, mut exited, mut kernel, mut user) = (zero, zero, zero, zero);
            let ok = GetProcessTimes(handle, &mut created, &mut exited, &mut kernel, &mut user);
            CloseHandle(handle);
            if ok == 0 {
                return None;
            }
            Some(ticks(kernel) + ticks(user))
        }
    }
}

#[cfg(not(windows))]
impl CpuSampler for OsCpuSampler {
    fn cpu_time_100ns(&self, _pid: u32) -> Option<u64> {
        None
    }
}
