# byzantine — build plan, design, and resume state

> Crash-safe checkpoint. Updated 2026-08-08. If a session dies, resume from
> **RESUME POINT** below; everything needed is in this file + the repo.

## Goal

`byzantine.play.naigap.com` — a course that takes a backend engineer
(Java/Python background) from "the network lies" to operating distributed
systems proven under partition. Platform: kernelspace's lesson engine +
wasm lab grader (zero-dep, browser-runnable Rust labs).

Curriculum: **T0 Failure & Time → T1 Consensus → T2 Consistency & Transactions
→ T3 Production Anatomy** + a capstone, with 6 graded labs and a live
5-node Raft cluster sim ("The Cluster").

## Status

**Shipped (live):** platform fork + T0/T1 launch content (6 lessons) +
lab 01 echo-node + The Cluster v0 sim. Deployed via GitHub Pages, custom
domain registered, cert provisioning.

**In flight (this build):** the Raft lab arc + remaining lessons + capstone.

### Lab arc (6 labs)

| # | slug | dir | state |
|---|------|-----|-------|
| 01 | echo-node | labs/echo-node | ✅ DONE — shipped in v0, verified green on live site |
| 02 | kv-store | labs/kv-store | ✅ DONE — sequential KV, template 5 red / solution 5 green, wasms at /tmp/{template,solution}-kv.wasm |
| 03 | election | labs/election | ✅ DONE — leader election, template 5 red / solution 5 green, wasms at /tmp/{template,solution}-election.wasm |
| 04 | raft-log | labs/raft-log | ✅ solution 5 green + wasm at /tmp/solution-raftlog.wasm. ⚠️ TEMPLATE RED NOT YET VERIFIED — restore template (it's in git/repo at labs/raft-log/src/raft.rs? NO — currently overwritten with solution; template content was written via write tool, restore from git if committed, else rewrite) |
| 05 | snapshots | labs/snapshots | 🔴 IN PROGRESS — harness + template + solution written; `check_compact_bounds` FAILS (panic message not yet captured; run `cargo test -p snapshots compact_bounds` WITHOUT tail-cutting to see panic). One earlier full run HUNG (was cancelled) — suspect an unbounded retry or degenerate compact loop |
| 06 | linearizable-kv | — | ⬜ NOT STARTED — capstone lab: client ops through Raft, read-write register linearizable under partition |

### Remaining work after labs

1. **9 lessons**: t0.13 failure-detectors-and-timeouts, t0.14 retries-idempotency,
   t1.12 raft-replication, t1.13 split-brain-and-safety, t2.11 consistency-models,
   t2.12 distributed-transactions, t3.11 production-anatomy (etcd/ZK/Kafka/
   Spanner/TigerBeetle reading), t3.12 reading-jepsen, t3.13 drills-intro.
2. **Registry updates**: src/data/labs.ts entries (5 new labs), track.ts
   lesson wiring, counts.
3. **Partition Drills page**: 3 scripted incident quizzes (Fleet Week incident
   card pattern, static telemetry, no wasm) — the "capstone" alongside lab 06.
4. **Pack zips** (scripts/pack-labs.mjs), update labs/README.md + AGENTS.md.
5. Build + lint + browser-verify every lab page upload flow.
6. Push + deploy + verify live.

## Design decisions (do not re-litigate)

### Lab harness pattern (labs 02–06 share it)

- **One file the student edits**: `src/<name>.rs` (raft.rs for 03–06).
- **Harness = src/lib.rs**: deterministic simulated network (`Net`) +
  driver; `self_checks()` returns `Vec<kslab::Check>`; wasm ABI `ks_run`.
- **Student node API (labs 03–06)**: `Raft::new(id, peers)`,
  `on_timeout() -> Vec<Msg>`, `on_msg(from, msg) -> Vec<Msg>`,
  `heartbeat() -> Vec<Msg>` (04+), `propose(cmd) -> Vec<Msg>` (04+),
  `compact(cut) -> Vec<Msg>` (05), `role()/term()/commit_index()/log()`,
  `log_len()` (05). `Msg` enum is student-owned, must `#[derive(Clone)]`.
- **Bring code forward**: each lab's template says "paste your previous
  lab's solution, add X". Labs build on each other like real life.
- **Deterministic randomness**: xorshift rng streams; per-node streams
  seeded `0x9E375AFE + i*0x123456789` → randomized-timeout behavior
  without timing lottery (lesson from lab 03: static staggered timeouts
  deadlock on synchronized split votes).
- **Election timers are harness-side**: per-node `silent` counters reset
  on AppendEntries from current/newer term; leader heartbeats every
  HB_TICKS=6. Timeout = 12 + rand%14.
- **Full-log heartbeats** (04+): leaders broadcast their entire log with
  prev=(0,0) each heartbeat — inefficient vs next_index backtracking but
  exactly correct; followers truncate-and-replace. Documented as the
  intentional simplification.
- **Commit rule**: leaders only advance commit on CURRENT-TERM entries
  held by a majority (the Raft safety rule).
- **Storm-check invariant**: committed prefixes IDENTICAL on all nodes +
  floor on count (lab 04: ≥15 of 30; lab 05: ≥25 of 40). Uncommitted
  tail entries legitimately die on leader churn — NEVER check
  committed == proposed.
- **delete-version rule (lab 02)**: delete ALWAYS bumps version, even
  for absent keys — delete is a mutation ATTEMPT. Harness + solution +
  template docs all agree (this was a real inconsistency caught and fixed).

### Lab 05 snapshot model

- Snapshot = committed COMMAND prefix (state machine is replayable).
- `last_included_index/term` = the seam; all external indices logical.
- Follower whose log ends before the seam can't match prev → replies
  fail with match_index < last_included_index → leader sends
  InstallSnapshot; follower adopts snapshot as committed history and
  keeps live entries beyond it.
- Driver compacts when leader's live log > 24 (`compact(12)`).

## Verified toolchain facts

- rustup/cargo at ~/.cargo/bin (PATH prefix needed), wasm32 target installed.
- Node/bun for site build: `bun run build` in /root/byzantine.
- zips: `python3 scripts/pack-labs.mjs`? NO — pack script is
  `scripts/pack-labs.mjs` run via bun: `bun scripts/pack-labs.mjs`
  (check scripts/ dir; it packs labs/*/ into public/labs/*.zip).
- Deploy: push to master → .github/workflows/deploy.yml → GitHub Pages.
  Custom domain byzantine.play.naigap.com registered via API; DNS wildcard
  resolves to GitHub Pages IPs; HTTPS cert provisioning (may take time,
  site serves fine over http and https).
- gh CLI authenticated as praveen13 (repo praveen13/byzantine).
- Kernelspace repo untouched at /root/kernelspace (platform source).

## RESUME POINT

1. `cd /root/byzantine/labs && cargo test -p snapshots` — capture the
   compact_bounds panic FULL output (no tail cut). Fix the bug. Likely
   candidates: (a) index underflow in commit-advance loop
   `idx - last_included_index - 1`, (b) the InstallSnapshot keep-calculation
   (`keep_from` vs log.len), (c) compact() cut arithmetic when
   commit_index < last_included_index + COMPACT_TO.
2. Then: template red check for labs 04 + 05 (cp solution out, template
   in, expect all checks FAIL; restore template afterward), build all wasms,
   save to /tmp.
3. Lab 06 (linearizable-kv) — design in "Lab arc" table: client ops
   (get/put/cas) through leader, responses only after commit (linearizable
   reads = read from committed state); checks: linearizable history under
   partition churn, stale-leader rejection, CAS correctness. Reuse lab 05
   harness shape; student implements apply() + client-facing commit wait.
4. Lessons → registry → drills page → zips → verify → push (list above).
