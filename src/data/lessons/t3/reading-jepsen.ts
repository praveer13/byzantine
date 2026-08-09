import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't3.l2',
  slug: 'reading-jepsen',
  trackId: 't3',
  index: 2,
  title: 'Reading Jepsen: How to Break a Database',
  minutes: 25,
  hook: '\'Strongly consistent\' on the marketing page, a counterexample in the appendix — Jepsen is how you learn to read both.',
  exercise: 'read+quiz',
  blocks: [
    {
      type: 'prose',
      md: `A Jepsen test is mechanically simple, which is why it's devastating. Real nodes run the real software as a cluster. Harness-driven **clients** issue operations against it — reads, writes, compare-and-set — while a **nemesis** injects the faults from T0: partitions, clock skew, process kills and pauses. Every invocation and every response, with timing, is recorded. When the run ends, that record — **the history** — is handed to a **checker** (Knossos searches for a linearization; Elle builds the dependency graph and hunts cycles) which asks: *does there exist any execution, allowed by the claimed consistency model, that produces this history?*

Notice what is *not* consulted: the source code, the configuration, the architecture diagram, the marketing page, the vendor's intentions. The history is the evidence. A Jepsen analysis is the adversarial version of the invariant checks your lab harness has been running all along.`,
    },
    {
      type: 'prose',
      md: `## The anomaly zoo

One line each, so you can recognize them in the wild:

- **Stale read** — a read returns a value older than a write that *completed* before the read began. Fine under eventual consistency; fatal to linearizability.
- **Lost update** — two transactions read the same value and write back; one silently overwrites the other. The classic read-committed failure.
- **Dirty read** — a transaction reads a value another transaction hasn't committed yet. Forbidden at read committed and above.
- **Aborted read** — a read observes a value from a transaction that later *rolls back*: it saw something that never officially existed.
- **Write skew** — two transactions read a shared invariant ("at least one doctor on call"), each updates a different row, both commit, and the invariant is broken. Snapshot isolation admits it; only serializable forbids it.
- **G-single / G2** — dependency *cycles*: draw "happened-before" edges between transactions and find a loop, and no serial order can explain the history. G-single is a cycle with exactly one anti-dependency edge; G2 is a cycle of anti-dependency edges. This is how a checker *proves* a history isn't serializable — not vibes, a cycle.

Map it back to T2.L1: linearizability kills the stale read for single-object operations; snapshot isolation kills dirty reads and lost updates but keeps write skew; serializable (and strict serializable) kills the cycles. The zoo is the same consistency spectrum, seen from the failure side.`,
    },
    {
      type: 'prose',
      md: `## How to read an analysis

Skip the intro — the product recap and the test setup matter, but the payload is always a section called something like "the history": a concrete counterexample, usually a small diagram of operations with times, showing a read that couldn't have happened. Two reading rules:

1. **One counterexample falsifies.** Correctness claims are universal — "every history is linearizable" — so a single violating history disproves the claim as tested. Ten thousand clean runs prove nothing; one dirty one proves everything. This is why a good analysis shows you *one* small history and stops.
2. **Classify the finding.** *Bug found and fixed*: the behavior violated the system's own documented semantics, a patch landed, later tests confirm. *Working as designed, docs overstated*: the system kept its real contract and the adjective on the website was lying. Both findings are valuable; only one is a bug. The second kind is why you read semantics from tests, not from feature pages.

## Famous scars, briefly

- **etcd** — early testing found **stale reads** under partitions: reads served from a local state machine that had fallen behind, while claiming linearizability. Fixed by routing linearizable reads through Raft (quorum/read-index). Lesson: linearizable is a property of the *read path*, not just writes.
- **MongoDB** — repeated analyses pushed on what \`majority\` read and write concern actually guarantee, and found versions where "majority" reads could still return stale data. The semantics and the docs were tightened over time. Lesson: a concern name is a contract, and contracts get tested.
- **CockroachDB** — the other direction: a vendor that adopted Jepsen itself, ran it in development, published results, and fixed what it found. The harness as a development tool, not a hit piece.
- **Elasticsearch** — after early analyses found lost writes and split-brain behavior, Elastic published a public **resiliency status** page tracking known issues and fixes. For its era, an unusually honest artifact.

Every one of these systems is better now. The point of the scars is not the dunking — it's that a method existed which found, forced, and verified the fixes.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      md: `Your lab harness ≡ a tiny Jepsen. Simulated network ≡ the nemesis. Injected partitions and delayed messages ≡ fault injection. "Committed prefixes identical", "at most one leader per term" ≡ the checker. The differences are determinism and scale, not kind: you have been falsifying implementations against models since lab 01 — you just got to rewind and fix them yourself.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'In a Jepsen-style test, the checker consumes…',
          options: [
            'The database\'s source code',
            'The cluster\'s configuration files',
            'The recorded history — every operation invocation and response, with timing — searched for a violation of the claimed model',
            'The vendor\'s documented guarantees',
          ],
          correct: [2],
          explanation:
            'The history is the evidence. Code, config, and docs can all claim anything; the checker only asks whether some model-legal execution could have produced what the clients actually observed.',
        },
        {
          q: 'A single counterexample history proves…',
          options: [
            'Nothing — it could be a flake; rerun until it reproduces',
            'The claim is false as tested: correctness claims are universal, so one violating history falsifies "linearizable" — while no number of clean runs can prove it',
            'The bug only manifests at scale',
            'The test harness itself is buggy',
          ],
          correct: [1],
          explanation:
            'Asymmetry of falsification: "every history is linearizable" dies to one counterexample, but survives any number of passing samples unproven. That is why analyses lead with one small, damning history.',
        },
        {
          q: 'Two transactions each read "doctors on call = 2", each removes a different doctor, and both commit. This is…',
          options: [
            'A lost update',
            'A dirty read',
            'An aborted read',
            'Write skew — admitted by snapshot isolation; prevented at serializable (or by explicit locking/materializing the conflict)',
          ],
          correct: [3],
          explanation:
            'Each transaction wrote a different row, so no write-write conflict exists for snapshot isolation to detect — yet the shared invariant is broken. This is the canonical reason SI is not serializable.',
        },
        {
          q: 'An analysis shows a system returning stale reads under partitions while its docs claim linearizable reads. The vendor corrects the docs. The right reading is…',
          options: [
            'The database is fundamentally broken; never use it',
            '"Working as designed, docs overstated" — the system kept its real contract; read semantics from tests, not adjectives from websites',
            'Stale reads are harmless, so nothing happened',
            'The test must have been wrong, since the software was not changed',
          ],
          correct: [1],
          explanation:
            'The most common Jepsen outcome is a documentation fix, not a code fix: the implementation did what it was designed to do, and the guarantee was overstated. The durable skill is reading the actual contract.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Go read one, end to end',
      md: `Pick a system you actually run from [jepsen.io/analyses](https://jepsen.io/analyses) and read it to the history — notice how the whole argument rests on one small counterexample. Then the genre's origin: Kyle Kingsbury's [Call me maybe](https://aphyr.com/tags/jepsen) series, which established that "the network lies" is a testable claim, not a slogan. Finally, the [Elle paper](https://arxiv.org/abs/2003.10554) (Kingsbury & Alvaro, VLDB 2020) — how isolation anomalies become cycle-detection over a dependency graph, and why that made "is this history serializable?" a question a computer can answer fast.`,
    },
  ],
}

export default lesson
