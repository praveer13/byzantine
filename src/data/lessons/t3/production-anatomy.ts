import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't3.l1',
  slug: 'production-anatomy',
  trackId: 't3',
  index: 1,
  title: 'Production Anatomy: How the Real Ones Are Built',
  minutes: 30,
  hook: 'Five systems, one skeleton: quorum, log, state machine, snapshots — everything you built in labs 01–06 is in there, wearing different clothes.',
  exercise: 'read+quiz',
  blocks: [
    {
      type: 'prose',
      md: `Your capstone — a linearizable KV over your own Raft — is not a toy version of production systems. It is a *dissection* of them. Every system in this lesson is the same skeleton: a quorum-decided replicated log, a deterministic state machine applied on top, snapshots to keep the log finite. What differs is the workload the state machine serves and how honest the documentation is about failure. Learning to see the skeleton under the branding is the skill; after this lesson, "read the docs" means "find the log, find the quorum, find the state machine."

Here is the tour: what each system is for, the consensus/consistency core, and the one design decision worth stealing.`,
    },
    {
      type: 'prose',
      md: `## etcd: your capstone, older and tireder

What it is: the metadata store Kubernetes (and half the ecosystem) keeps its brain in. The core is Raft plus **MVCC**: every write bumps a global revision, old revisions survive until compaction. That revision is the log index, surfaced to users — which is what makes **watches** safe. A watch from revision 100 is a *subscription to the committed log from index 100 on*: events arrive in order, exactly once, and only after Raft commits them. A watch can never observe uncommitted state, because there is no path to the client except through the committed index. Linearizable reads likewise go through Raft (read-index/lease), not around it.

**Worth stealing:** expose the commit index as a user-visible revision. You get watches, consistent snapshots, and "how stale am I" almost for free.

## ZooKeeper/Zab: the lock substrate

What it is: the coordination service the Hadoop generation standardized on — config, membership, leader election, locks. The core is **Zab**, atomic broadcast: a leader totally-orders every write and broadcasts it; followers apply in that order. On top sit two primitives that became the distributed-lock substrate: **sessions** (a client connection with a lease) and **ephemeral sequential znodes** (files that die with the session, numbered in creation order). The canonical lock recipe: create an ephemeral sequential node; you hold the lock iff yours is the lowest number; otherwise watch *only your immediate predecessor*. Almost everyone built it wrong once — the naive version watched the whole directory (herd effect: every release wakes every waiter), or checked-then-created without the sequential number (a race where the holder dies between the two steps), or handed out a lock with no **fencing token**, so a long-paused client could wake up and write after losing the lock. T0.L4's idempotency lesson, wearing a hat.

**Worth stealing:** ephemeral + sequential + watch-the-predecessor is still the cleanest lease-and-queue primitive set ever shipped.`,
    },
    {
      type: 'prose',
      md: `## Kafka: the log is the database

What it is: a durable, replicated, totally-ordered commit log sold as a message broker. Kafka noticed that the log isn't a means to the state machine — for streams, the log *is* the product. Replication keeps an **ISR** (in-sync replica set): followers currently caught up. A record is committed when it passes the **high watermark** — every ISR member has it. The durability contract is \`acks=all\` plus \`min.insync.replicas\`: the producer's write returns only once the record sits on the required number of replicas. \`unclean.leader.election.enable\` is the explicit knob Raft refuses to give you: allow a non-ISR replica to lead (availability) or refuse (durability). And **leader epoch fencing** (KIP-101) replaced truncation-by-high-watermark with epoch-scoped logs, fixing a corner case where followers could diverge after leadership churn — Kafka re-learning Raft's completeness rule the hard way.

**Where it chose differently from Raft:** commit waits for *all* ISR members, not a fixed majority of all replicas — and slow followers get evicted from the ISR instead of blocking the quorum. Leader election picks from the ISR (via the controller; KRaft — an internal Raft quorum — replaced ZooKeeper for metadata). Same skeleton, quorum redefined for throughput.

## Spanner: clock uncertainty as an API

What it is: Google's globally replicated SQL database, externally consistent — transactions behave as if executed one at a time, in real-time order, across datacenters. The core trick industrializes T0.L2: **TrueTime** exposes the clock as what it physically is — an interval. \`TT.now()\` returns [earliest, latest], bounded by GPS receivers and atomic clocks, typically a few milliseconds wide. Commit-wait: the coordinator picks commit timestamp *s*, then waits until \`TT.after(s)\` — until *s* is provably in the past everywhere — before making the write visible. **The price of external consistency is paid in milliseconds of latency per commit, and the receipt is the interval width.**

**Worth stealing:** stop pretending the clock is a number. Return the interval, and decide explicitly who pays for the uncertainty.`,
    },
    {
      type: 'prose',
      md: `## TigerBeetle: the failure detector applied to language choice

What it is: a financial transactions database. Consensus (Viewstamped Replication) replicates a **journal** of operations; the state machine is deterministic **double-entry accounting** — accounts and transfers, balance invariants enforced by construction, history immutable. Because the state machine is deterministic, replay is exact, and the whole cluster can be driven by a deterministic simulator that injects faults faster than real time — your lab harness, taken seriously as the primary development environment.

The decision worth stealing is upstream of consensus: **static memory allocation**. All memory is reserved at startup; the hot path never allocates; written in Zig, there is no garbage collector. Why is that a distributed-systems decision? Because a GC pause is indistinguishable from a stalled node to every failure detector in the cluster (T0.L3). TigerBeetle didn't tune the detector — it removed the pause by construction. The failure-detector lesson, applied to language choice.

## The meta-lesson

Lay the five side by side. Every one is **quorum + log + state machine + snapshots**. etcd's state machine is an MVCC keyspace; ZooKeeper's is a hierarchical namespace with sessions; Kafka's is so thin the log itself became the API; Spanner's is SQL with 2PC across Paxos groups, priced by TrueTime; TigerBeetle's is a ledger. The real differences are workload and **honesty about failure** — what each promises, and what it documents as *not* promised. When you meet a new system, don't read the features page. Ask four questions: what is the quorum, what is in the log, what is the state machine, how does it recover. The answers are the system.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      md: `Your capstone ≡ etcd, at teaching scale. Raft log ≡ Raft log. Your linearizable GET/PUT state machine ≡ etcd's MVCC keyspace. Your "committed entries applied in order" ≡ etcd's revision counter and watch stream. The deltas — compaction, leases, read-index — are optimizations of the same skeleton, not new ideas. You have already built the hard 80%; the remaining 20% is operability.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'An etcd watch opened at revision 100 guarantees…',
          options: [
            'The latest value per key, possibly skipping intermediate versions when the network is slow',
            'Every committed change from revision 100 onward, in order — a watch only ever observes state Raft has committed',
            'Whatever the nearest follower currently holds in memory',
            'All leader proposals from index 100, including ones later lost to a new term',
          ],
          correct: [1],
          explanation:
            'A watch is a subscription to the committed log. The only path from state machine to client runs through the committed index — so uncommitted or later-lost proposals can never surface in a watch stream.',
        },
        {
          q: 'With acks=all and min.insync.replicas=2 on a 3-replica Kafka partition, a produce call returns successfully when…',
          options: [
            'All 3 configured replicas have the record, even the one currently down',
            'The leader has the record in its page cache',
            'The leader plus at least one ISR follower have it — the ISR is the quorum, not the full replica list',
            'The controller has acknowledged the write to the producer',
          ],
          correct: [2],
          explanation:
            'Kafka\'s replication quorum is the ISR, which shrinks to exclude slow or dead followers. acks=all means "all in-sync replicas", and min.insync.replicas sets the floor below which the partition refuses writes rather than acknowledge weak durability.',
        },
        {
          q: 'Spanner\'s commit-wait exists because…',
          options: [
            'Replicas need time to fsync before the write is durable',
            'Two-phase commit participants vote slowly across datacenters',
            'It rate-limits commits so TrueTime stays accurate',
            'The commit timestamp must be provably in the past before the write becomes visible — clock uncertainty is paid as a few ms of latency in exchange for external consistency',
          ],
          correct: [3],
          explanation:
            'TT.now() is an interval, so the coordinator waits until its chosen timestamp is definitely behind every clock in the system. That wait *is* the cost of guaranteeing real-time ordering of transactions.',
        },
        {
          q: 'TigerBeetle avoids dynamic memory allocation after startup primarily because…',
          options: [
            'RAM is expensive at that scale',
            'Static allocation has higher average throughput',
            'Allocator and GC pauses look exactly like stalled nodes to the cluster\'s failure detectors — deterministic latency is a liveness property, so the pauses are removed by construction',
            'It simplifies the build system',
          ],
          correct: [2],
          explanation:
            'A multi-hundred-ms GC pause trips election timeouts and heartbeats exactly like a dead node. Rather than loosen the failure detector (slower detection of real failures), TigerBeetle eliminates the false-positive source: no GC, no hot-path allocation.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Read the primary sources',
      md: `The [etcd/raft README](https://github.com/etcd-io/raft) — the library your capstone imitates, down to the API shape. The [ZooKeeper paper](https://www.usenix.org/legacy/events/atc10/tech/full_papers/Hunt.pdf) (Hunt et al., USENIX ATC 2010) — sessions, znodes, and the Zab broadcast protocol inside. Kafka's [design docs](https://kafka.apache.org/documentation/#design) plus [KIP-101](https://cwiki.apache.org/confluence/display/KAFKA/KIP-101+-+Alter+Replication+Protocol+to+use+Leader+Epoch+rather+than+High+Watermark+for+Truncation) — the epoch-fencing fix, written as an engineering memo. The [Spanner paper](https://research.google/pubs/spanner-googles-globally-distributed-database/) (OSDI 2012) — read the TrueTime section twice. TigerBeetle: [A Database Without Dynamic Memory Allocation](https://tigerbeetle.com/blog/2022-10-12-a-database-without-dynamic-memory) and the [safety doc](https://docs.tigerbeetle.com/concepts/safety) — the fault models section is the course's T0, restated as engineering requirements.`,
    },
  ],
}

export default lesson
