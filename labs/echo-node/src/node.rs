//! node.rs — forge lab 01 · THE ONLY FILE YOU EDIT
//!
//! Mission: an idempotent receiver. The network delivers each message one
//! or more times (loss is the harness's job, not yours). Your node must:
//!   * PROCESS each unique (from, seq) exactly once — `processed_count`
//!     counts unique messages, never duplicates;
//!   * ANSWER every delivery — one reply per on_message call;
//!   * return the ORIGINAL reply for replays (response caching).
//!
//! Contract:
//!   * `new(id)`            — your node id (unused in this lab; matters in T1)
//!   * `on_message(from, seq, payload)` — one delivery attempt → replies
//!   * `processed_count()`  — unique messages processed so far
//!
//! Suggested state:
//!
//!     seen: HashMap<(u32, u64), String>   // (sender, seq) → stored reply
//!     processed: usize
//!
//! Hints:
//!   * The reply for a NEW message is just the payload mirrored back
//!     (this is an echo handler — the effect is "it was processed").
//!   * A REPLAY returns the stored reply — do not re-derive, do not skip.
//!   * The key is the PAIR (from, seq). Two senders' seq 1 are unrelated.

use std::collections::HashMap;

pub struct Reply {
    pub to: u32,
    pub seq: u64,
    pub payload: String,
}

pub struct Node {
    // TODO(you): your state here.
    _priv: (),
}

impl Node {
    pub fn new(id: u32) -> Self {
        let _ = id;
        todo!("construct your node")
    }

    pub fn on_message(&mut self, from: u32, seq: u64, payload: &str) -> Vec<Reply> {
        let _ = (from, seq, payload);
        todo!("dedup: process once, answer always, replay the original")
    }

    pub fn processed_count(&self) -> usize {
        todo!("unique messages processed")
    }
}
