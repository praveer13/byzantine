//! store.rs — forge lab 02 · THE ONLY FILE YOU EDIT
//!
//! Mission: a sequential key-value store with correct mutation accounting.
//! Ops:
//!   * `get(key)`            — current value or None
//!   * `put(key, value)`     — unconditional write (a mutation)
//!   * `cas(key, expected, value)` — apply ONLY if current == expected
//!     (None expected matches a missing key); returns whether it applied
//!   * `delete(key)`         — remove; ALWAYS bumps the version (a delete
//!     is a mutation attempt whether or not the key existed — that is the
//!     rule the checks enforce)
//!   * `version()`           — mutations applied so far; bump ONCE per
//!     successful mutation (put/cas-applied/delete). Failed cas: no bump.
//!     Reads: no bump.
//!
//! The point: retries happen. `version` is what lets a client tell "my
//! write landed" from "my write landed twice". cas is what lets a client
//! not care.

use std::collections::HashMap;

pub struct Store {
    // TODO(you): your state here.
    _priv: (),
}

impl Store {
    pub fn new() -> Self {
        todo!("construct your store")
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let _ = key;
        todo!("read")
    }

    pub fn put(&mut self, key: &str, value: &str) {
        let _ = (key, value);
        todo!("write + version bump")
    }

    pub fn cas(&mut self, key: &str, expected: Option<&str>, value: &str) -> bool {
        let _ = (key, expected, value);
        todo!("compare-and-swap: apply on exact match only")
    }

    pub fn delete(&mut self, key: &str) {
        let _ = key;
        todo!("remove + version bump")
    }

    pub fn version(&self) -> u64 {
        todo!("mutations applied")
    }
}
