# byzantine — build plan, design, and resume state

> Crash-safe checkpoint. Updated 2026-08-09. If a session dies, resume from
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
| 02 | kv-store | labs/kv-store | ✅ DONE — sequential KV, template 5 red / solution 5 green, wasm ABI-verified |
| 03 | election | labs/election | ✅ DONE — leader election, template 5 red / solution 5 green, wasm ABI-verified |
| 04 | raft-log | labs/raft-log | ✅ DONE — template rewritten (was lost), 5 red / solution 5 green, wasm ABI-verified |
| 05 | snapshots | labs/snapshots | ✅ DONE — solution fixed (see below), template rewritten, 4 red / solution 4 green, wasm ABI-verified |
| 06 | linearizable-kv | labs/linearizable-kv | ✅ DONE — capstone built: put/cas through the log, get() replays committed prefix only; 4 checks (put_get_basic, cas_correctness, stale_leader_fence, linearizable_storm); template 4 red / solution 4 green, wasm ABI-verified |

### Lab 05 bug that was killing compact_bounds (fixed 2026-08-09)

Symptom was "hang"; actually OOM (SIGKILL, confirmed in dmesg). Root cause:
on an AppendEntries seam mismatch the follower replied `match_index:
last_log_index()` (HIGH), so the leader never fell back to InstallSnapshot
and re-sent AppendEntries; each reply was broadcast ×4 by the harness →
exponential message ping-pong. Fix (now in _solutions/snapshots/raft.rs and
carried into lab 06): follower reports its own LOW seam when the anchor is
beyond it (and seam−1 on seam-term mismatch); follower AHEAD of the anchor
skips snapshot-covered entries; stale snapshots never move the seam
backward; leader's match_index no longer double-counts self.

### Remaining work after labs

1. ~~**9 lessons**~~ ✅ DONE — all 9 written (t0.l3/l4, t1.l2/l3, t2.l1/l2,
   t3.l1/l2/l3) under src/data/lessons/{t0,t1,t2,t3}/.
2. ~~**Registry updates**~~ ✅ DONE — labs.ts (6 labs), tracks.ts (T0–T3 +
   counts), lessons/index.ts (TrackId extended to t2/t3, TRACK_EXTRAS),
   progress.ts TOTAL_LESSONS=12, Progress.tsx labs counter,
   CommandPalette de-kernelspaced.
3. ~~**Partition Drills page**~~ ✅ DONE — /drills, 3 incident cards
   (stale-leader, quorum-loss, flapping-leader), static telemetry in
   src/data/drills.ts, Fleet Week incident-card pattern, no wasm.
4. ~~**Pack zips**~~ ✅ DONE — scripts/pack-labs.py packs all 6 labs
   (SHARED + crate_files helpers); labs/README.md de-kernelspaced
   (labs table, echo-node lane A), labs/AGENTS.md de-kernelspaced.
5. ✅ tsc -b clean, eslint clean, bun run build clean, preview smoke
   200s on all routes, zips verified to ship TEMPLATES not solutions.
   Headless ABI verify (bun scripts/verify-wasm-lab.ts): all 5 new
   solution wasms pass, all 5 template wasms trap as designed.
   ⚠️ NOT done: real browser pass over each lab page upload flow.
6. **Push + deploy + verify live** ← NEXT

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

Everything is built and verified locally. Only the ship step remains:

1. `git add -A && git commit` (lab arc 04–06 + fix, 9 lessons, drills page,
   registries, zips, this PLAN) and `git push origin master` → deploy.yml →
   GitHub Pages.
2. Verify live: https://byzantine.play.naigap.com — /curriculum shows T0–T3
   (12 lessons), /labs shows 6 labs with working zip downloads, /drills runs,
   one lab page upload flow with a solution wasm (in /tmp, or rebuild).
3. Optional polish later: real browser pass per lab page; dist chunk-size
   warning (code-split); the Cluster sim could grow lab-06-style get().
