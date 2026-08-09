//! raft.rs — forge lab 05 · THE ONLY FILE YOU EDIT
//!
//! Mission: log compaction. Logs can't grow forever. The leader snapshots
//! committed state, truncates the log, and pulls lagging followers forward
//! with InstallSnapshot instead of a log walk back to the stone age.
//!
//! START by pasting your lab-04 solution below (election + replication).
//! Then grow it:
//!
//!   * Two new pieces of state: `snapshot: Vec<String>` (the committed
//!     COMMAND prefix — our state machine is replayable, so the commands
//!     ARE the state) and `last_included_index` / `last_included_term`,
//!     the seam between snapshot and live log. Your live `log` holds only
//!     entries AFTER the seam; every external index stays LOGICAL
//!     (snapshot counts as history).
//!   * `compact(cut)` (leader): move the first `cut` committed live
//!     entries into the snapshot, remember the seam term, truncate.
//!     Never cut past commit_index.
//!   * Heartbeats/proposals now anchor at the seam: AppendEntries carries
//!     prev = (last_included_index, last_included_term) plus the whole
//!     live log. A follower whose seam is BEHIND that anchor can't verify
//!     the match — it must reply failure with a LOW match_index (its own
//!     seam), which tells you to send InstallSnapshot { last_included_*,
//!     data: snapshot }. A follower whose seam is AHEAD of the anchor
//!     skips the snapshot-covered entries and applies only the rest.
//!   * On InstallSnapshot (follower): adopt the snapshot as committed
//!     history (commit_index ≥ last_included_index), drop any live log it
//!     covers, keep entries BEYOND it. Never let a stale snapshot move
//!     your seam backward.
//!   * `log()` returns the FULL logical history: snapshot commands, then
//!     live entries. `log_len()` is the LIVE count only — the driver
//!     compacts when it grows past 24.
//!
//! Keep `#[derive(Clone)]` and these exact Msg variants — the harness
//! pattern-matches on them.

#[derive(Clone)]
pub enum Msg {
    RequestVote { term: u64, candidate: u32, last_log_index: u64, last_log_term: u64 },
    RequestVoteReply { term: u64, granted: bool },
    AppendEntries { term: u64, leader: u32, prev_log_index: u64, prev_log_term: u64, entries: Vec<(u64, String)>, leader_commit: u64 },
    AppendEntriesReply { term: u64, follower: u32, success: bool, match_index: u64 },
    InstallSnapshot { term: u64, leader: u32, last_included_index: u64, last_included_term: u64, data: Vec<String> },
    InstallSnapshotReply { term: u64, follower: u32 },
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    Follower,
    Candidate,
    Leader,
}

pub struct Raft {
    // TODO(you): lab-04 state plus snapshot: Vec<String>,
    // last_included_index: u64, last_included_term: u64.
    _priv: (),
}

impl Raft {
    pub fn new(id: u32, peers: Vec<u32>) -> Self {
        let _ = (id, peers);
        todo!("construct a follower at term 0, empty snapshot and log")
    }

    pub fn on_timeout(&mut self) -> Vec<Msg> {
        todo!("election — last_log_index/term must span the seam (snapshot edge if the live log is empty)")
    }

    pub fn on_msg(&mut self, from: u32, msg: Msg) -> Vec<Msg> {
        let _ = (from, msg);
        todo!("lab-04 handlers + InstallSnapshot / InstallSnapshotReply")
    }

    pub fn heartbeat(&mut self) -> Vec<Msg> {
        todo!("leader: full-live-log AppendEntries anchored at the seam")
    }

    pub fn propose(&mut self, cmd: String) -> Vec<Msg> {
        let _ = cmd;
        todo!("leader: append (term, cmd) to the live log, broadcast")
    }

    pub fn compact(&mut self, cut: u64) -> Vec<Msg> {
        let _ = cut;
        todo!("leader: snapshot the first `cut` committed live entries, advance the seam")
    }

    pub fn role(&self) -> Role {
        todo!("current role")
    }

    pub fn term(&self) -> u64 {
        todo!("current term")
    }

    pub fn commit_index(&self) -> u64 {
        todo!("logical commit index (snapshot counts)")
    }

    pub fn log(&self) -> Vec<String> {
        todo!("FULL logical history: snapshot commands, then live entries")
    }

    pub fn log_len(&self) -> usize {
        todo!("live (post-seam) entry count only")
    }
}
