//! raft.rs — forge lab 03 · THE ONLY FILE YOU EDIT
//!
//! Mission: the election layer of Raft. Five nodes, a hostile wire, one
//! rule: at most one leader per term.
//!
//! The message type is YOURS (the harness clones and broadcasts it):
//! keep `#[derive(Clone)]` and these exact variants — the harness only
//! constructs RequestVote/RequestVoteReply this lab; AppendEntries arrives
//! in lab 04, but define it now so your message type is stable.
//!
//! Semantics to implement:
//!   * `on_timeout()` — election timer fired: become candidate, bump term,
//!     vote for self, broadcast RequestVote { term, candidate: id, 0, 0 }.
//!   * RequestVote(from): grant if their term ≥ yours AND you haven't
//!     voted this term; a NEWER term updates yours and steps you down to
//!     follower (with your vote reset). Reply RequestVoteReply.
//!   * RequestVoteReply: count grants for your current candidacy;
//!     a majority (> N/2) makes you leader.
//!   * Any message with a HIGHER term than yours: adopt it, step down.
//!     Any message with a LOWER term: refuse/ignore (fence it).
//!
//! The harness calls `role()` and `term()` to judge you.

#[derive(Clone)]
pub enum Msg {
    RequestVote { term: u64, candidate: u32, last_log_index: u64, last_log_term: u64 },
    RequestVoteReply { term: u64, granted: bool },
    AppendEntries { term: u64, leader: u32, prev_log_index: u64, prev_log_term: u64, entries: Vec<String>, leader_commit: u64 },
    AppendEntriesReply { term: u64, follower: u32, success: bool, match_index: u64 },
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Role {
    Follower,
    Candidate,
    Leader,
}

pub struct Raft {
    // TODO(you): your state here. You will want: id, peers, role, term,
    // voted_for, votes_received.
    _priv: (),
}

impl Raft {
    pub fn new(id: u32, peers: Vec<u32>) -> Self {
        let _ = (id, peers);
        todo!("construct a follower at term 0")
    }

    pub fn on_timeout(&mut self) -> Vec<Msg> {
        todo!("become candidate: bump term, vote self, ask everyone")
    }

    pub fn on_msg(&mut self, from: u32, msg: Msg) -> Vec<Msg> {
        let _ = (from, msg);
        todo!("handle RequestVote / RequestVoteReply (+ term fencing)")
    }

    pub fn role(&self) -> Role {
        todo!("current role")
    }

    pub fn term(&self) -> u64 {
        todo!("current term")
    }
}
