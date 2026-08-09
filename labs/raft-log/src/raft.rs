//! REFERENCE SOLUTION — forge lab 04 (byzantine). Not shipped in the zip.
//!
//! Full-log heartbeats: leaders broadcast their entire log each time
//! (prev = 0,0). Inefficient vs next_index backtracking, but simple and
//! exactly correct — followers truncate-and-replace on conflict.

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
    id: u32,
    n: usize,
    role: Role,
    term: u64,
    voted_for: Option<u32>,
    votes: usize,
    log: Vec<(u64, String)>, // 1-based logically; index i = entry i+1
    commit_index: u64,
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
            log: Vec::new(),
            commit_index: 0,
            match_index: Default::default(),
        }
    }

    fn last_term(&self) -> u64 {
        self.log.last().map(|e| e.0).unwrap_or(0)
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
            prev_log_index: 0,
            prev_log_term: 0,
            entries: self.log.clone(),
            leader_commit: self.commit_index,
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
            last_log_index: self.log.len() as u64,
            last_log_term: self.last_term(),
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

    pub fn on_msg(&mut self, _from: u32, msg: Msg) -> Vec<Msg> {
        match msg {
            Msg::RequestVote { term, candidate, last_log_index, last_log_term } => {
                if term > self.term {
                    self.step_down_to(term);
                }
                // the completeness rule: never vote for a staler log
                let up_to_date = last_log_term > self.last_term()
                    || (last_log_term == self.last_term() && last_log_index >= self.log.len() as u64);
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
                        self.match_index.insert(self.id, self.log.len() as u64);
                    }
                }
                vec![]
            }
            Msg::AppendEntries { term, prev_log_index, prev_log_term, entries, leader_commit, .. } => {
                if term < self.term {
                    return vec![Msg::AppendEntriesReply {
                        term: self.term,
                        follower: self.id,
                        success: false,
                        match_index: self.log.len() as u64,
                    }];
                }
                self.step_down_to(term);
                self.term = term;
                // log-match check
                if prev_log_index > 0 {
                    let ok = self.log.get((prev_log_index - 1) as usize).map(|e| e.0) == Some(prev_log_term);
                    if !ok {
                        return vec![Msg::AppendEntriesReply {
                            term: self.term,
                            follower: self.id,
                            success: false,
                            match_index: self.log.len() as u64,
                        }];
                    }
                }
                // truncate conflicts, append new
                let mut idx = prev_log_index as usize;
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
                let new_commit = leader_commit.min(self.log.len() as u64);
                if new_commit > self.commit_index {
                    self.commit_index = new_commit;
                }
                vec![Msg::AppendEntriesReply {
                    term: self.term,
                    follower: self.id,
                    success: true,
                    match_index: self.log.len() as u64,
                }]
            }
            Msg::AppendEntriesReply { term, follower, success, match_index } => {
                if term > self.term {
                    self.step_down_to(term);
                    return vec![];
                }
                if self.role == Role::Leader && term == self.term && success {
                    let cur = self.match_index.entry(follower).or_insert(0);
                    *cur = (*cur).max(match_index);
                    // advance commit: highest CURRENT-TERM index on a majority
                    for idx in (self.commit_index + 1)..=(self.log.len() as u64) {
                        if self.log[(idx - 1) as usize].0 != self.term {
                            continue; // only current-term entries (the safety rule)
                        }
                        let holders = self.match_index.values().filter(|&&m| m >= idx).count() + 1; // + self
                        if holders > self.n / 2 {
                            self.commit_index = idx;
                        }
                    }
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
        self.log.iter().map(|e| e.1.clone()).collect()
    }
}
