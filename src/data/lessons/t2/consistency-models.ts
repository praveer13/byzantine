import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't2.l1',
  slug: 'consistency-models',
  trackId: 't2',
  index: 1,
  title: 'Consistency Models: What Are You Even Promising?',
  minutes: 25,
  hook: 'Consistent is not a property a database has — it is a contract it signed. Linearizable, sequential, causal, eventual: four promises at four prices, and most "stale data" postmortems are contract disputes nobody read.',
  exercise: 'quiz',
  blocks: [
    {
      type: 'prose',
      md: `T1 built the mechanism: Raft replicates a log, quorums make *committed* survive crashes and partitions. But a mechanism is not a specification. When a client calls \`get(k)\`, what is it allowed to see? Last week's value? A value that was never committed? The **consistency model** is the answer — the contract between storage and client about which values a read may return and which it may not.

"It's consistent" is marketing. The contract is specific, and it is testable: given a history of operations, you can check whether the system kept its promise. This lesson is the spec sheet. The capstone lab is you implementing the strong end of it.`,
    },
    {
      type: 'prose',
      md: `## The spectrum, made operational

Four contracts, strongest to weakest. For each: the promise in one sentence, what a client can rely on, and who actually offers it.

- **Linearizability** — every operation takes effect atomically at one instant, in an order that respects real time. Client can rely on: once a write is acknowledged, *every* later read sees it. Offered by: etcd and ZooKeeper quorum reads, Spanner, your capstone if you build it right.
- **Sequential consistency** — one global order exists and every observer agrees on it, but it need not respect real time. Client can rely on: everyone's history interleaves consistently — yet a read may legally miss a write that already completed. Offered by: ZooKeeper's default follower reads.
- **Causal consistency** — operations related by happens-before (T0.L2) appear in that order for everyone; concurrent operations may be seen in different orders. Client can rely on: the reply never appears before the post it answers. Offered by: MongoDB's causal sessions, CRDT stores.
- **Eventual consistency** — if writes stop, all replicas converge to the same value. Eventually. Client can rely on: convergence, and nothing else. Offered by: DynamoDB default reads, Cassandra at low consistency levels, DNS, and every cache you have ever deployed.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the spectrum: what the client may assume',
      height: 44,
      nodes: [
        { id: 'lin', x: 2, y: 16, w: 21, h: 10, label: 'linearizable', sub: 'one order + real time', color: '#3EF2A4' },
        { id: 'seq', x: 27, y: 16, w: 21, h: 10, label: 'sequential', sub: 'one order, no real time', color: '#22D3EE' },
        { id: 'cau', x: 52, y: 16, w: 21, h: 10, label: 'causal', sub: 'happens-before kept', color: '#A78BFA' },
        { id: 'ev', x: 77, y: 16, w: 21, h: 10, label: 'eventual', sub: 'convergence only', color: '#FBBF24' },
      ],
      edges: [
        { from: 'lin', to: 'seq', label: 'weaker' },
        { from: 'seq', to: 'cau' },
        { from: 'cau', to: 'ev' },
      ],
      steps: [
        { caption: 'Linearizable: each op takes effect atomically, in real-time order. Once anyone reads x=2, no one will ever read x=1 again.', active: ['lin'], edges: [] },
        { caption: 'Sequential: one global order exists and all observers agree on it — but it may rewrite real time. The stale read is legal here.', active: ['seq'], edges: ['lin->seq'] },
        { caption: 'Causal: cause is never shown after effect. Concurrent ops — no message path between them — may appear in different orders to different clients.', active: ['cau'], edges: ['seq->cau'] },
        { caption: 'Eventual: the only promise is convergence once writes stop. Any read, any past value, until then — all legal.', active: ['ev'], edges: ['cau->ev'] },
      ],
    },
    {
      type: 'prose',
      md: `## Linearizability, precisely but humanly

The formal definition is shorter than its reputation: **each operation takes effect atomically at some point between its invocation and its response.** That is the whole atom. Add the real-time rule — if operation A completes (response sent) before operation B begins (invocation received), B must come after A — and two consequences fall out:

1. **Reads never go backward.** Once any client has seen \`x=2\`, no client will ever read \`x=1\` again. Values only move forward.
2. **A read is a proof about committed state.** In the capstone, your leader answers \`get()\` only from committed entries while it still holds authority for its term — and T1's quorum intersection is what makes that answer a proof instead of a guess. A partitioned ex-leader still serving reads is exactly the history Jepsen flags as a linearizability violation.

Note the scope: linearizability is a *single-object* guarantee — one key, one register. "Atomic across keys" is a different, stronger promise with its own machinery. That promise is the next lesson.`,
    },
    {
      type: 'prose',
      md: `## Sequential is not linearizable: the stale-read wedge

The wedge: client writes \`x=1\` and gets its ack, then immediately reads \`x\` from a different replica and gets the old value. Under linearizability this is a contract violation — real time says the write finished first. Under sequential consistency it is perfectly legal: there exists a global order (read, then write) that every observer agrees on and that keeps each client's own operations in program order. Read-your-own-write is gone, and nobody lied — you just signed the cheaper contract.

This is not hypothetical. ZooKeeper's default reads come from a follower's local state and are sequential, not linearizable — which is why \`sync()\` exists: the paid upgrade from "some agreed order" to "as of now."`,
    },
    {
      type: 'prose',
      md: `## Eventual consistency's honest name: convergence

"Eventual" promises exactly one thing: stop writing, wait, and the replicas converge. It is silent about what a read sees meanwhile — last Tuesday's value is a legal answer. Systems choose it because it is the only model that keeps answering through every partition and every dead node, and they make it *usable* by layering **session guarantees** on top: read-your-writes, monotonic reads, monotonic writes, writes-follow-reads — promises scoped to one client's session.

That combination is where most production actually lives: DynamoDB's consistent-read flag, MongoDB's causal sessions, every CDN's "your own edit shows up for you." Convergence underneath, per-client sanity on top. Session guarantees are cheap precisely because they constrain what *one* observer sees — no global coordination required.`,
    },
    {
      type: 'prose',
      md: `## CAP, placed correctly

CAP says one thing, and it is narrower than the conference-talk version: **during a partition**, a system must choose — answer every request with possibly-stale data (available), or refuse to answer until the partition heals (consistent). You cannot have both, because the two sides cannot coordinate. No partition, no forced choice — the rest of the time the theorem is silent.

The everyday trade is PACELC: **if Partition, then Availability vs Consistency; Else, Latency vs Consistency.** Synchronous replication pays latency for consistency on every single write, healthy network or not; asynchronous replication is fast and will sometimes serve last week's value. Your T1 Raft cluster is a concrete CP — no majority, no writes — and it pays quorum latency on the happy path. When a vendor says "we're CA," what they mean is "we have not yet been partitioned in a way that made the dashboard red."`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      md: `A consistency model is an **interface**, not an implementation. \`LinearizableStore\` extends \`Store\` with "get returns the latest committed value" — and single-node-with-a-mutex, Raft, and Spanner are three implementations with wildly different internals. Designing a system means picking the weakest interface your application can live with; operating one means knowing which interface you actually deployed. And like interfaces, the contract is testable: Jepsen is the test suite that runs a real cluster against the contract it advertises. T1 built the mechanism; this lesson is the spec; T3 is what happens when you test the gap.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'Linearizability, stated precisely, is…',
          options: [
            'Every replica holds identical data at every instant',
            'Each operation takes effect atomically at some point between its invocation and its response, in an order that respects real time',
            'Writes are fsynced before acknowledgment',
            'Transactions execute as if run one at a time',
          ],
          correct: [1],
          explanation:
            'The first option describes a mechanism fantasy, not a model; the last describes serializability, a multi-operation guarantee. Linearizability is per-operation, per-object, and real-time — once a write is acknowledged, no read anywhere may return to before it.',
        },
        {
          q: 'A client writes x=1, gets the ack, then reads x from another replica and sees the old value. Which contract was violated?',
          options: [
            'Sequential consistency',
            'Eventual consistency',
            'Linearizability — the write completed in real time before the read began, so no legal order may place the read first',
            'None — this is always legal',
          ],
          correct: [2],
          explanation:
            'Sequential consistency allows it: an agreed global order with the read placed first exists. Only linearizability\'s real-time clause forbids it. Read-your-own-write is the litmus test that separates the two models.',
        },
        {
          q: 'The honest name for eventual consistency — and the usual fix that makes it usable — is…',
          options: [
            'ACID; add more replicas',
            'Convergence; session guarantees like read-your-writes and monotonic reads, scoped to one client',
            'Weak consistency; stronger hardware',
            'Asynchronous replication; longer timeouts',
          ],
          correct: [1],
          explanation:
            'Eventual promises only that replicas converge once writes stop. Session guarantees layer per-client promises on top — cheap, because they constrain what one observer sees and never require global coordination.',
        },
        {
          q: 'CAP, stated correctly, says…',
          options: [
            'Pick any two of consistency, availability, partition tolerance — always',
            'During a partition you must choose availability or consistency; otherwise the live trade is latency vs consistency (PACELC)',
            'Partitions make consistency impossible',
            'CA systems exist if the network is good enough',
          ],
          correct: [1],
          explanation:
            'Partition tolerance is not optional — networks partition. The theorem bites only *during* one: answer stale, or do not answer. Between partitions the real dial is PACELC\'s "else": pay latency for synchronous consistency, or pay staleness for speed.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Audit one system you run',
      md: `Pick one database or store you operate — Postgres, Redis, MongoDB, DynamoDB, Cassandra, Elasticsearch — and find every consistency claim in its docs. Map each to a point on this spectrum. Keep two columns: words that are contracts (linearizable, monotonic, read-your-writes, causal) and words that are vibes (strong, high, fully). Then read the Jepsen analysis for that system if one exists — the gap between your two columns is exactly what T3 teaches you to test.`,
    },
  ],
}

export default lesson
