/**
 * Forge labs — local-only Rust labs, graded in-browser (same zero-dep
 * wasm ABI as the rest of the platform: ks_alloc/ks_free/ks_run).
 */

import type { TrackId } from '@/data/lessons/types'

export interface ForgeLabCheck {
  id: string
  label: string
}

export interface ForgeLab {
  id: string
  index: number
  title: string
  hook: string
  trackId: TrackId
  lessonId: string
  minutes: number
  zip: string
  artifact: string
  editFile: string
  completion: { title: string; next: string }
  checks: ForgeLabCheck[]
  brief: string[]
}

export const FORGE_LABS: ForgeLab[] = [
  {
    id: 'echo-node',
    index: 1,
    title: 'Exactly Once, At Least Once',
    hook: 'Your first node: an echo handler over a network that loses and duplicates messages. Dedup table, response cache, and the discipline that makes retries safe — graded by 2000 hostile deliveries.',
    trackId: 't0',
    lessonId: 't0.l1',
    minutes: 60,
    zip: '/labs/echo-node.zip',
    artifact: 'target/wasm32-unknown-unknown/release/echo_node.wasm',
    editFile: 'src/node.rs',
    completion: {
      title: 'all five green — your node survives a lying network.',
      next: 'next: T1 puts five of these on The Cluster and makes them elect a leader. Your dedup table just became a state machine.',
    },
    checks: [
      { id: 'echo_basic', label: 'echo: reply mirrors payload and seq' },
      { id: 'dup_effect_once', label: 'duplicates: effect applied once, answered every time' },
      { id: 'monotonic_seq', label: 'replayed seq gets the ORIGINAL answer' },
      { id: 'multi_sender', label: 'dedup is per (sender, seq), not global' },
      { id: 'storm', label: '2000 hostile deliveries: every unique message processed exactly once' },
    ],
    brief: [
      'At-least-once delivery is the only kind a real network can offer — which means duplicates are not an edge case, they are the air your node breathes. The discipline: process each unique message EXACTLY once (the effect), while answering every delivery (the response). Retry-safe by construction, not by luck.',
      'The structure is a dedup table keyed by (sender, seq) that stores the REPLY, not just a seen-flag — a replayed message gets the original answer back, not a shrug. This is the idempotent-receiver pattern, and it is the seed of every replicated state machine you will build in T1.',
      'The harness is the teacher: five checks from a polite echo to a 2000-delivery storm with ~30% loss and duplication across 8 senders. If your counting is off by one duplicate anywhere, the storm finds it.',
    ],
  },
  {
    id: 'kv-store',
    index: 2,
    title: 'Versions Are the Truth',
    hook: 'A single-node KV with no network at all — and it still finds ways to lie. get/put/delete/cas with version stamps and retry-safe semantics: the state machine your Raft labs will replicate.',
    trackId: 't0',
    lessonId: 't0.l4',
    minutes: 60,
    zip: '/labs/kv-store.zip',
    artifact: 'target/wasm32-unknown-unknown/release/kv_store.wasm',
    editFile: 'src/store.rs',
    completion: {
      title: 'all five green — your store is honest about what happened.',
      next: 'next: T1 puts five of these on a lossy wire and makes them agree. Your version counter just grew a term number.',
    },
    checks: [
      { id: 'basics', label: 'get/put/delete semantics' },
      { id: 'cas_semantics', label: 'cas applies only on exact match' },
      { id: 'versions', label: 'version counts mutations, once each' },
      { id: 'retry_safety', label: 'an op retried after a lost response applies once' },
      { id: 'storm', label: '2000 ops vs a reference model' },
    ],
    brief: [
      'No network, no partitions, no excuses: one node, one map, and a grader that replays 2000 operations against a reference model. The lesson is that even a single node must define its semantics precisely — what does delete of an absent key do, what does a compare-and-set compare against, and what exactly does the version counter count?',
      'The rule that bites: delete ALWAYS bumps the version, even for a key that was never there — a delete is a mutation ATTEMPT, and an attempt is history. Retry safety follows the same discipline as lab 01: an operation retried after a lost response applies once. These feel like pedantry until T1, where five replicas must agree on precisely this history.',
      'The harness is the teacher: five checks from basic semantics through cas edge cases to the 2000-op storm. If your version accounting is off by one anywhere, the storm finds it.',
    ],
  },
  {
    id: 'election',
    index: 3,
    title: 'One Leader Per Term',
    hook: 'Five nodes, a hostile wire, one rule: at most one leader per term. The election layer of Raft — terms, votes, quorum intersection, and fencing — graded by simulated partitions.',
    trackId: 't1',
    lessonId: 't1.l1',
    minutes: 60,
    zip: '/labs/election.zip',
    artifact: 'target/wasm32-unknown-unknown/release/election.wasm',
    editFile: 'src/raft.rs',
    completion: {
      title: 'all five green — your cluster elects one leader and only one.',
      next: 'next: lab 04 gives the leader something to say. Your vote logic just became the front door of a replicated log.',
    },
    checks: [
      { id: 'clean_election', label: 'one leader emerges on a quiet wire' },
      { id: 'one_per_term', label: 'at most one leader per term, under loss' },
      { id: 'minority_refuses', label: 'the minority side of a partition elects no one' },
      { id: 'term_fencing', label: 'stale leaders step down after healing' },
      { id: 'split_votes', label: 'split votes resolve to one leader' },
    ],
    brief: [
      'The whole of consensus reduces to one trick: any two majorities overlap. This lab is that trick, executable. on_timeout() makes a candidate — bump term, vote for self, ask everyone. on_msg() grants votes once per term to logs that aren\'t staler. A majority makes a leader. Everything else Raft does hangs on these three moves.',
      'The harness runs a deterministic simulated network: message loss, delays, partitions, and election timers driven by per-node randomized timeouts (a static stagger deadlocks — you may discover why the paper insists on randomness). The minority side of a partition must elect NO ONE; unavailability by design is the correct answer to a 2-3 split.',
      'Terms are fencing tokens: any message from a newer term steps you down, and a stale leader after a heal must fold immediately. Five checks, from a quiet-wire election to split votes under loss. You define the Msg type — it stays with you through lab 06, so make it honest.',
    ],
  },
  {
    id: 'raft-log',
    index: 4,
    title: 'The Log Is the Product',
    hook: 'A leader without a log is just a loud node. Bring your lab-03 election forward and replicate: AppendEntries, the commit rule, and the majority safety argument — with committed prefixes compared across every node.',
    trackId: 't1',
    lessonId: 't1.l2',
    minutes: 90,
    zip: '/labs/raft-log.zip',
    artifact: 'target/wasm32-unknown-unknown/release/raft_log.wasm',
    editFile: 'src/raft.rs',
    completion: {
      title: 'all five green — one history, everywhere, even under loss.',
      next: 'next: lab 05 teaches the log to forget. Your replication just gained a snapshot seam.',
    },
    checks: [
      { id: 'replicate_basic', label: 'a write replicates and commits on a majority' },
      { id: 'majority_required', label: 'no commit without a majority' },
      { id: 'heal_and_catchup', label: 'post-heal convergence to one log' },
      { id: 'no_committed_loss', label: 'committed entries survive leader change' },
      { id: 'storm', label: '30 writes under loss: one committed history on all nodes' },
    ],
    brief: [
      'Paste your lab-03 solution and grow it: leaders append (term, command) to their own log, broadcast AppendEntries, and followers truncate-and-replace on conflict. The simplification: every heartbeat carries the ENTIRE log with prev = (0,0) — inefficient versus next_index backtracking, and exactly correct. Optimize later; survive first.',
      'The rule that production bites with: a leader advances commit_index only over entries from its CURRENT term held by a majority. Older-term entries ride the prefix to safety. Counting replicas of old-term entries is the bug the Raft paper\'s §5.4.2 exists to kill — and the storm check here will kill it too.',
      'Committed prefixes are compared across all five nodes after 30 writes under 15% loss. Uncommitted tail entries legitimately die on leader churn — the invariant is about what COMMITTED means: identical, everywhere, forever.',
    ],
  },
  {
    id: 'snapshots',
    index: 5,
    title: 'Teach the Log to Forget',
    hook: 'Logs can\'t grow forever. Snapshot the committed prefix, truncate the live log, and pull lagging followers forward with InstallSnapshot instead of a walk back to the stone age.',
    trackId: 't1',
    lessonId: 't1.l3',
    minutes: 75,
    zip: '/labs/snapshots.zip',
    artifact: 'target/wasm32-unknown-unknown/release/snapshots.wasm',
    editFile: 'src/raft.rs',
    completion: {
      title: 'all four green — bounded logs, infinite history.',
      next: 'next: the capstone. Your log becomes a database that never lies to a reader.',
    },
    checks: [
      { id: 'compact_bounds', label: 'log stays bounded; history intact via snapshot' },
      { id: 'snapshot_catchup', label: 'lagging node catches up via snapshot, not log walk' },
      { id: 'state_after_compact', label: 'early commands remain in committed history after compaction' },
      { id: 'storm_compact', label: '40 writes under loss + compaction: one history everywhere' },
    ],
    brief: [
      'Bring your lab-04 Raft forward. The state machine here is replayable, so the snapshot is just the committed COMMAND prefix: compact(cut) moves the first `cut` committed entries behind a seam — last_included_index and last_included_term — and every external index stays logical. Your live log is only the suffix.',
      'The new failure mode: a follower so far behind that its log ends before your seam can never match prev. It must say so with a LOW match_index — its own seam — so you answer with InstallSnapshot instead of an AppendEntries it will reject forever. Get that reply arithmetic wrong and two nodes will politely re-send the same message until the machine runs out of memory. (Yes, the grader will notice. So did we.)',
      'Followers on InstallSnapshot: adopt the snapshot as committed history, drop what it covers, keep live entries beyond it, and never let a stale snapshot move the seam backward. Four checks: bounded logs, snapshot catch-up across a partition, history integrity, and a 40-write storm with compaction running.',
    ],
  },
  {
    id: 'linearizable-kv',
    index: 6,
    title: 'A Response Is a Proof',
    hook: 'The capstone. A replicated log is not a database until clients can read it without being lied to: put/cas through the log, reads answered ONLY from committed state — graded under partition churn.',
    trackId: 't2',
    lessonId: 't2.l1',
    minutes: 90,
    zip: '/labs/linearizable-kv.zip',
    artifact: 'target/wasm32-unknown-unknown/release/linearizable_kv.wasm',
    editFile: 'src/raft.rs',
    completion: {
      title: 'all four green — a linearizable KV on your own Raft. That is the whole course.',
      next: 'next: the Partition Drills. Three dying clusters, and you have seen every one of their ghosts in simulation.',
    },
    checks: [
      { id: 'put_get_basic', label: 'committed writes are readable on every node' },
      { id: 'cas_correctness', label: 'cas applies iff committed value matches; exactly one winner' },
      { id: 'stale_leader_fence', label: 'stale leader never reads back an uncommitted write' },
      { id: 'linearizable_storm', label: 'partition churn + compaction: reads == committed replay everywhere' },
    ],
    brief: [
      'Everything you built comes home. Your lab-05 Raft already replicates and compacts; this lab adds the client contract. The command language is `put k v` and `cas k old new` — cas evaluated AT APPLY TIME against committed state, so two competing swaps have exactly one winner. This is the linearizable register the whole course pointed at.',
      'The read path is the lesson: get(key) replays the committed prefix — snapshot commands, then live entries up to commit_index — and answers from that. A partitioned leader that accepted a write it can\'t replicate must NOT return it. If it isn\'t committed, it doesn\'t exist. Stale-leader reads are how real systems lose data while looking healthy; the grader partitions your old leader and asks it directly.',
      'Final exam shape: a put/cas mix under 15% loss with a mid-run partition and compaction firing. Afterwards every node\'s get() must equal the harness\'s own replay of the committed prefix — on ALL five nodes. That equality is linearizability, and you built it from an echo server.',
    ],
  },
]

export function forgeLabById(id: string | undefined): ForgeLab | undefined {
  return FORGE_LABS.find((l) => l.id === id)
}
