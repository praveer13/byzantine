//! raft.rs — forge lab 06 · THE ONLY FILE YOU EDIT
//!
//! Mission: linearizability. A replicated log is not a database until
//! clients can READ it without being lied to. Turn your Raft into a
//! key-value store where every read observes exactly the committed state —
//! no stale leader optimism, no uncommitted phantoms.
//!
//! START by pasting your lab-05 solution below (election + replication +
//! snapshots). Then grow it:
//!
//!   * The command language (entries in your log):
//!       - `put k v`       — set key k to value v
//!       - `cas k old new` — set k = new ONLY IF the current committed
//!                           value of k is `old`, evaluated AT APPLY TIME.
//!                           An absent key never matches.
//!   * `get(key) -> Option<String>`: a LINEARIZABLE read. Replay the
//!     committed prefix of your full logical history (snapshot commands,
//!     then live entries up to commit_index), applying puts and winning
//!     casses in order, and answer from that state. If a write isn't
//!     committed, it doesn't exist — even if YOU are the leader who
//!     accepted it. That is the whole lesson: a response is a proof.
//!
//! Nothing else changes: elections, replication, compaction all carry
//! forward. The judges replay your committed log themselves and compare
//! your get() against it on EVERY node, after partition churn.
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
    // TODO(you): lab-05 state (id, peer count, role, term, voted_for, votes,
    // snapshot, last_included_index/term, live log, commit_index,
    // match_index). The KV state itself needs NO new field — it is derived
    // by replaying the committed prefix.
    _priv: (),
}

impl Raft {
    pub fn new(id: u32, peers: Vec<u32>) -> Self {
        let _ = (id, peers);
        todo!("construct a follower at term 0, empty snapshot and log")
    }

    pub fn on_timeout(&mut self) -> Vec<Msg> {
        todo!("lab-05 election")
    }

    pub fn on_msg(&mut self, from: u32, msg: Msg) -> Vec<Msg> {
        let _ = (from, msg);
        todo!("lab-05 handlers (votes, append, snapshots)")
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

    pub fn get(&self, key: &str) -> Option<String> {
        let _ = key;
        todo!("replay the COMMITTED prefix (snapshot + live up to commit_index), answer from that state")
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
