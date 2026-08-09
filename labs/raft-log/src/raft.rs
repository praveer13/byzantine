//! raft.rs — forge lab 04 · THE ONLY FILE YOU EDIT
//!
//! Mission: log replication. Leaders don't just exist — they carry a log.
//! Clients propose commands; a command is SAFE only once a majority holds
//! it; only then may it be committed.
//!
//! START by pasting your lab-03 solution below (election + term fencing).
//! Then grow it:
//!
//!   * `propose(cmd)` (leader only): append (current_term, cmd) to YOUR log,
//!     broadcast AppendEntries. We simplify: every AppendEntries carries the
//!     leader's ENTIRE log with prev = (0, 0) — no next_index backtracking.
//!     Inefficient, exactly correct.
//!   * AppendEntries(from leader): fence stale terms; on a NEWER/equal term
//!     step down and follow. Walk the incoming entries: where an existing
//!     entry's TERM disagrees, truncate everything from there and take the
//!     leader's; append what you don't have. Then pull your commit_index up
//!     to min(leader_commit, your last index). Reply AppendEntriesReply with
//!     success + your match_index (how much of the leader's log you provably
//!     hold).
//!   * AppendEntriesReply (at the leader): track match_index per follower.
//!     THE SAFETY RULE: advance commit_index only over entries from your
//!     CURRENT term that a majority holds (don't forget to count yourself).
//!     Older-term entries become committed indirectly, with the prefix.
//!   * `heartbeat()` (leader): the same AppendEntries, on a timer — it is
//!     both keepalive and repair.
//!
//! `log()` returns the command strings in order; the judges compare the
//! COMMITTED prefix of every node — they must be identical, always.
//!
//! Keep `#[derive(Clone)]` and these exact Msg variants — the harness
//! pattern-matches on them.

#[derive(Clone)]
pub enum Msg {
    RequestVote { term: u64, candidate: u32, last_log_index: u64, last_log_term: u64 },
    RequestVoteReply { term: u64, granted: bool },
    AppendEntries { term: u64, leader: u32, prev_log_index: u64, prev_log_term: u64, entries: Vec<(u64, String)>, leader_commit: u64 },
    AppendEntriesReply { term: u64, follower: u32, success: bool, match_index: u64 },
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    Follower,
    Candidate,
    Leader,
}

pub struct Raft {
    // TODO(you): lab-03 state (id, peer count, role, term, voted_for, votes)
    // plus: log: Vec<(u64, String)> as (term, command), commit_index, and a
    // per-follower match_index map for when you're leader.
    _priv: (),
}

impl Raft {
    pub fn new(id: u32, peers: Vec<u32>) -> Self {
        let _ = (id, peers);
        todo!("construct a follower at term 0 with an empty log")
    }

    pub fn on_timeout(&mut self) -> Vec<Msg> {
        todo!("lab-03 election — but last_log_index/term now describe YOUR log")
    }

    pub fn on_msg(&mut self, from: u32, msg: Msg) -> Vec<Msg> {
        let _ = (from, msg);
        todo!("RequestVote / RequestVoteReply / AppendEntries / AppendEntriesReply")
    }

    pub fn heartbeat(&mut self) -> Vec<Msg> {
        todo!("leader: broadcast full-log AppendEntries; others: nothing")
    }

    pub fn propose(&mut self, cmd: String) -> Vec<Msg> {
        let _ = cmd;
        todo!("leader: append (term, cmd) locally, broadcast AppendEntries")
    }

    pub fn role(&self) -> Role {
        todo!("current role")
    }

    pub fn term(&self) -> u64 {
        todo!("current term")
    }

    pub fn commit_index(&self) -> u64 {
        todo!("highest index known committed (majority-held, current-term rule)")
    }

    pub fn log(&self) -> Vec<String> {
        todo!("all commands in log order")
    }
}
