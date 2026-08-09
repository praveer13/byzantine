//! REFERENCE SOLUTION — forge lab 05 (byzantine). Not shipped in the zip.
//!
//! Model: snapshot = committed command prefix. The log is the suffix.
//! last_included_index/term mark the seam. commit_index and all external
//! indices are LOGICAL (snapshot counts).

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
    id: u32,
    n: usize,
    role: Role,
    term: u64,
    voted_for: Option<u32>,
    votes: usize,
    snapshot: Vec<String>,
    last_included_index: u64,
    last_included_term: u64,
    log: Vec<(u64, String)>, // entries AFTER last_included_index
    commit_index: u64,       // logical (includes snapshot)
    match_index: std::collections::HashMap<u32, u64>,
}

impl Raft {
    pub fn new(id: u32, peers: Vec<u32>) -> Self {
        Raft {
            id,
            n: peers.len() + 1,
            role: Role::Follower,
            term: 0,
            voted_for: None,
            votes: 0,
            snapshot: Vec::new(),
            last_included_index: 0,
            last_included_term: 0,
            log: Vec::new(),
            commit_index: 0,
            match_index: Default::default(),
        }
    }

    fn last_log_index(&self) -> u64 {
        self.last_included_index + self.log.len() as u64
    }

    fn last_log_term(&self) -> u64 {
        if let Some(e) = self.log.last() {
            e.0
        } else {
            self.last_included_term
        }
    }

    fn step_down_to(&mut self, term: u64) {
        if term > self.term {
            self.term = term;
            self.voted_for = None;
        }
        self.role = Role::Follower;
    }

    fn append_msg(&self) -> Msg {
        Msg::AppendEntries {
            term: self.term,
            leader: self.id,
            prev_log_index: self.last_included_index,
            prev_log_term: self.last_included_term,
            entries: self.log.clone(),
            leader_commit: self.commit_index,
        }
    }

    fn snapshot_msg(&self) -> Msg {
        Msg::InstallSnapshot {
            term: self.term,
            leader: self.id,
            last_included_index: self.last_included_index,
            last_included_term: self.last_included_term,
            data: self.snapshot.clone(),
        }
    }

    pub fn on_timeout(&mut self) -> Vec<Msg> {
        self.role = Role::Candidate;
        self.term += 1;
        self.voted_for = Some(self.id);
        self.votes = 1;
        vec![Msg::RequestVote {
            term: self.term,
            candidate: self.id,
            last_log_index: self.last_log_index(),
            last_log_term: self.last_log_term(),
        }]
    }

    pub fn heartbeat(&mut self) -> Vec<Msg> {
        if self.role != Role::Leader {
            return vec![];
        }
        vec![self.append_msg()]
    }

    pub fn propose(&mut self, cmd: String) -> Vec<Msg> {
        if self.role != Role::Leader {
            return vec![];
        }
        self.log.push((self.term, cmd));
        vec![self.append_msg()]
    }

    pub fn compact(&mut self, cut: u64) -> Vec<Msg> {
        if self.role != Role::Leader {
            return vec![];
        }
        let cut = cut.min(self.commit_index.saturating_sub(self.last_included_index));
        if cut == 0 {
            return vec![];
        }
        let cut = cut as usize;
        // snapshot the command prefix, remember the seam term
        self.snapshot.extend(self.log[..cut].iter().map(|e| e.1.clone()));
        self.last_included_term = self.log[cut - 1].0;
        self.last_included_index += cut as u64;
        self.log.drain(..cut);
        vec![]
    }

    pub fn on_msg(&mut self, _from: u32, msg: Msg) -> Vec<Msg> {
        match msg {
            Msg::RequestVote { term, candidate, last_log_index, last_log_term } => {
                if term > self.term {
                    self.step_down_to(term);
                }
                let up_to_date = last_log_term > self.last_log_term()
                    || (last_log_term == self.last_log_term() && last_log_index >= self.last_log_index());
                let grant = term >= self.term
                    && up_to_date
                    && (self.voted_for.is_none() || self.voted_for == Some(candidate));
                if grant {
                    self.voted_for = Some(candidate);
                    self.term = term;
                    self.role = Role::Follower;
                }
                vec![Msg::RequestVoteReply { term: self.term.max(term), granted: grant }]
            }
            Msg::RequestVoteReply { term, granted } => {
                if term > self.term {
                    self.step_down_to(term);
                    return vec![];
                }
                if self.role == Role::Candidate && term == self.term && granted {
                    self.votes += 1;
                    if self.votes > self.n / 2 {
                        self.role = Role::Leader;
                        self.match_index.clear();
                        self.match_index.insert(self.id, self.last_log_index());
                    }
                }
                vec![]
            }
            Msg::AppendEntries { term, prev_log_index, prev_log_term, entries, leader_commit, .. } => {
                if term < self.term {
                    return vec![Msg::AppendEntriesReply { term: self.term, follower: self.id, success: false, match_index: self.last_log_index() }];
                }
                self.step_down_to(term);
                self.term = term;
                // match at the seam: prev must be exactly our snapshot edge,
                // or a point inside our live log
                if prev_log_index != self.last_included_index || prev_log_term != self.last_included_term {
                    return vec![Msg::AppendEntriesReply { term: self.term, follower: self.id, success: false, match_index: self.last_log_index() }];
                }
                // follower's live log must cover the leader's prefix region;
                // if the leader's seam is beyond our history, we need a snapshot
                if self.last_included_index < prev_log_index {
                    return vec![Msg::AppendEntriesReply { term: self.term, follower: self.id, success: false, match_index: self.last_log_index() }];
                }
                let mut idx = 0usize; // position within live log
                for (t, cmd) in entries {
                    if idx < self.log.len() {
                        if self.log[idx].0 != t {
                            self.log.truncate(idx);
                            self.log.push((t, cmd));
                        }
                    } else {
                        self.log.push((t, cmd));
                    }
                    idx += 1;
                }
                let new_commit = leader_commit.min(self.last_log_index());
                if new_commit > self.commit_index {
                    self.commit_index = new_commit;
                }
                vec![Msg::AppendEntriesReply { term: self.term, follower: self.id, success: true, match_index: self.last_log_index() }]
            }
            Msg::AppendEntriesReply { term, follower, success, match_index } => {
                if term > self.term {
                    self.step_down_to(term);
                    return vec![];
                }
                if self.role != Role::Leader || term != self.term {
                    return vec![];
                }
                if !success {
                    // follower is behind the seam → send the snapshot
                    if match_index < self.last_included_index {
                        return vec![self.snapshot_msg()];
                    }
                    return vec![self.append_msg()];
                }
                let cur = self.match_index.entry(follower).or_insert(0);
                *cur = (*cur).max(match_index);
                for idx in (self.commit_index + 1)..=self.last_log_index() {
                    let live_idx = idx - self.last_included_index - 1;
                    if self.log[live_idx as usize].0 != self.term {
                        continue;
                    }
                    let holders = self.match_index.values().filter(|&&m| m >= idx).count() + 1;
                    if holders > self.n / 2 {
                        self.commit_index = idx;
                    }
                }
                vec![]
            }
            Msg::InstallSnapshot { term, last_included_index, last_included_term, data, .. } => {
                if term < self.term {
                    return vec![Msg::InstallSnapshotReply { term: self.term, follower: self.id }];
                }
                self.step_down_to(term);
                self.term = term;
                // keep live entries strictly beyond the snapshot
                let overlap = self.last_included_index.max(0) as u64;
                let keep_from = last_included_index.saturating_sub(overlap);
                let keep: Vec<(u64, String)> = if keep_from as usize > self.log.len() {
                    vec![]
                } else if last_included_index >= overlap {
                    self.log.split_off(keep_from as usize)
                } else {
                    vec![]
                };
                self.snapshot = data;
                self.last_included_index = last_included_index;
                self.last_included_term = last_included_term;
                self.log = keep;
                if self.commit_index < last_included_index {
                    self.commit_index = last_included_index;
                }
                vec![Msg::InstallSnapshotReply { term: self.term, follower: self.id }]
            }
            Msg::InstallSnapshotReply { term, .. } => {
                if term > self.term {
                    self.step_down_to(term);
                }
                vec![]
            }
        }
    }

    pub fn role(&self) -> Role {
        self.role
    }

    pub fn term(&self) -> u64 {
        self.term
    }

    pub fn commit_index(&self) -> u64 {
        self.commit_index
    }

    pub fn log(&self) -> Vec<String> {
        let mut out = self.snapshot.clone();
        out.extend(self.log.iter().map(|e| e.1.clone()));
        out
    }

    pub fn log_len(&self) -> usize {
        self.log.len()
    }
}
