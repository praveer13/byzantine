# byzantine forge — local labs

Real Rust. Your machine. Zero servers.

Each lab is a small crate. You edit exactly one file (marked `TODO(you)`),
prove it with `cargo test`, compile it to WebAssembly, and drop the `.wasm`
onto the lab page — the site runs the **same checks** and records your
completion. No account, no upload of your code, nothing leaves your machine
except nothing at all.

## The three lanes

**Lane A — your own machine (fastest if you have Rust)**

```sh
rustup target add wasm32-unknown-unknown   # one time
cd echo-node
cargo test                                  # red → green
cargo build --release --target wasm32-unknown-unknown
# drop target/wasm32-unknown-unknown/release/echo_node.wasm
# onto the lab page
```

Don't have Rust? `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
(Windows: https://rustup.rs)

**Lane B — VS Code Dev Containers (zero local setup)**

Open this folder in VS Code → "Reopen in Container". The image has the
toolchain and the wasm target preinstalled. Then the Lane A commands.

**Lane C — GitHub Codespaces (zero machine)**

Open the byzantine repository in a Codespace — the repo's
`.devcontainer` gives you the same environment. Burns your free GitHub
quota, not ours.

## The loop

1. **Read the brief** on the lab page.
2. **Edit the one file** with `TODO(you)` markers. Nothing else.
3. `cargo test` until every check is green. The terminal and the site
   run the identical suite — if it's green here, it's green there.
4. **Build the wasm** (`--release`, target `wasm32-unknown-unknown`).
5. **Drop the `.wasm` onto the lab page.** It runs in your browser, in a
   sandbox, against the same checks. All green → lab complete (+XP).

A `todo!()` left in your code makes the module trap — the site shows
"not implemented yet". That's a feature, not a bug.

## Labs

| # | lab | track | you build |
|---|-----|-------|-----------|
| 01 | `echo-node/` | T0 | idempotent receiver: dedup table, response cache, exactly-once effect |
| 02 | `kv-store/` | T0 | sequential KV: versions, compare-and-set, delete-as-mutation-attempt |
| 03 | `election/` | T1 | Raft leader election: terms, votes, quorum, fencing |
| 04 | `raft-log/` | T1 | log replication: AppendEntries, commit rule, majority safety |
| 05 | `snapshots/` | T1 | log compaction: snapshot the committed prefix, InstallSnapshot catch-up |
| 06 | `linearizable-kv/` | T2 | the capstone: a linearizable KV over your own Raft, graded under partitions |

Labs build on each other like real life: each template from 03 up says
"paste your previous lab's solution, add X".

## How grading works (honesty box)

The checks live in `src/lib.rs` of each lab — read them, that's allowed.
The site trusts the module you drop; this is the honor system, like every
problem set you've ever done. Your portfolio artifact is the repo with your
commit history, not our database. (A verified-badge server path is planned;
your local pass will be re-gradable retroactively.)

## Don't lose your work (two answers, both trivial)

**Your code → git.** On day one, inside the unzipped folder:

```sh
git init && git add -A && git commit -m "lab 01: template"
# then one commit per green check:
#   git commit -am "boot+align green"
```

That repo — with its commit history — IS your portfolio artifact. Push it
to a private GitHub repo and your work survives any laptop.

**Your progress → JSON snapshot.** Everything the site tracks (lessons,
quizzes, lab completions, XP, achievements, drill scores) lives in your
browser's localStorage. Export a snapshot anytime from the
**Progress page → data ownership → Export**, and re-import it on any
device/browser. Local by default, portable on demand.
