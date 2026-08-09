import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't2.l2',
  slug: 'distributed-transactions',
  trackId: 't2',
  index: 2,
  title: 'Distributed Transactions: 2PC, Its Ghosts, and the Modern Answer',
  minutes: 30,
  hook: 'Atomicity across machines is a promise made by a coordinator that can die mid-sentence. Two-phase commit is the promise; its failure modes are the ghosts; the modern answer is to replicate the coordinator, make execution deterministic, or stop needing atomicity at all.',
  exercise: 'read+quiz',
  blocks: [
    {
      type: 'prose',
      md: `Your kv-store lab already has atomicity of a sort: one node, one log, one fsync, and a write either happened or it didn't. That is ACID's A in its natural habitat — a local transaction needs one commit record on one disk, and the WAL makes "all or nothing" nearly free.

Now shard the data, which you will do the moment one node gets too small. A transfer from \`account:alice\` (shard 1) to \`account:bob\` (shard 2) must commit on both or on neither. Commit is no longer a fsync; it is a **distributed decision** — and T0 already told you what decisions cost when messages get lost and nodes go silent. Two-phase commit (2PC) is the classic construction. Learn it honestly, including where the bodies are buried.`,
    },
    {
      type: 'prose',
      md: `## Two-phase commit, walked honestly

The coordinator — the node that received the transaction — runs two rounds:

1. **Prepare: the vote.** The coordinator asks every participant: *can you commit this?* Each participant writes the changes to its own log, takes the locks it needs, and votes YES or NO. A YES is a binding promise: "I have made this durable, and I will commit if — and only if — you tell me to."
2. **Commit: the decision.** All YES → the coordinator writes COMMIT to *its own log first*, then broadcasts the decision. Any NO, or a vote that never arrives → ABORT. Participants apply the decision, release locks, and acknowledge.

Two facts carry the entire design: **the decision belongs to the coordinator alone**, and **the coordinator records it durably before announcing it**. The first is what makes the outcome atomic; the second is what lets a recovered coordinator finish the job. Together, they are also the trap.`,
    },
    {
      type: 'prose',
      md: `## The failure matrix, where the ghosts live

- **Participant dies before voting.** Easy. The coordinator times out and decides ABORT — nobody promised anything, nobody is stuck.
- **Participant dies after voting YES.** On recovery it reads its log, finds an *in-doubt* transaction, and must ask the coordinator. It cannot commit (maybe someone voted NO) and cannot abort (maybe the decision was COMMIT). Until it learns the decision, it **holds its locks and waits**.
- **Coordinator dies before deciding.** Every YES voter is now in-doubt indefinitely — the decision died with the coordinator. Locks held, throughput bleeding into the floor, an operator getting paged. This is the blocking that every 2PC war story is about.
- **Coordinator dies after writing the decision.** The safe case. On recovery it reads its log and re-announces the decision until every participant acks.

The fix everyone reaches for first — "just time out and abort" — is exactly the move you cannot make. A participant that unilaterally aborts while the coordinator committed has produced the both-committed-and-aborted history the protocol exists to forbid. Deciding requires telling *dead* from *slow*, and T0 spent a lesson proving that impossible in an asynchronous network. 2PC's blocking is not a bug in the protocol. It is the price of safety, itemized.`,
    },
    {
      type: 'prose',
      md: `## 3PC: the ghost that stayed in textbooks

Three-phase commit inserts a *pre-commit* round between vote and decision so that — in theory — participants can terminate a stalled transaction without the coordinator. The catch is the assumptions: bounded message delay and no partitions. Bounded delay is what finally lets "no response" mean "dead" — the one conclusion T0 said an asynchronous network never justifies. Under a real partition, 3PC can commit on one side and abort on the other. It survives mostly in exams; production went three other directions entirely.`,
    },
    {
      type: 'prose',
      md: `## The modern answers

1. **Replicate the coordinator.** Spanner, CockroachDB, and YugabyteDB still run 2PC across shards — but every shard is a Raft/Paxos group, and the transaction record lives in the replicated log. A "dead coordinator" becomes a leadership change: the group remembers the decision, and a new leader finishes the protocol. The blocking didn't vanish — it got a quorum of its own. This is your T1 mechanism, promoted to carrying transactions.
2. **Make execution deterministic.** Calvin and TigerBeetle decide a global transaction order up front (via consensus), then execute deterministically in that order — single-threaded, no mid-transaction coordination. When the ordering decision happens *before* execution, there is no in-doubt state and blocking has nowhere to live.
3. **Refuse global atomicity.** Sagas replace one atomic commit with a chain of local transactions, each paired with a **compensating action** — refund, cancel, un-reserve. The outbox pattern keeps each step honest: write the outgoing message to your local database in the same transaction as the state change, then a relay delivers it at-least-once, and T0.L4's idempotency keys make redelivery safe. You trade "all at once" for "eventually, observably, and never stuck holding a lock across services."`,
    },
    {
      type: 'prose',
      md: `## XA: what your app server was actually doing

If you came up through Java EE, you have already run 2PC — it was called XA, driven through JTA. A \`@Transactional\` method spanning two databases meant the app server was the coordinator and each database's \`XAResource\` was a participant voting on prepare. The two DataSources, the \`UserTransaction\`, the app-server transaction log nobody looked at: that was phase one and phase two wearing enterprise clothes.

And when WebLogic or WebSphere logged a *heuristic mixed* completion, or a DBA had to manually force an in-doubt transaction to release its locks — that was a YES vote whose coordinator died mid-sentence, with a human standing in for the missing failure detector. When the human guessed wrong, one database committed and the other rolled back, both healthy. That is what "heuristic hazard" means.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The runbook is the consistency model',
      md: `XA's accepted escape hatch is the heuristic decision: an operator forces an in-doubt transaction to commit or abort so its locks get released. Be clear about what is being traded — the protocol's safety proof for an operator's availability. Every forced decision that guesses wrong is a silent split: one participant committed, one aborted, no alarms. If your runbook contains "force commit," then the runbook, not the protocol, is your actual consistency model.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A participant voted YES, and the coordinator has gone silent. The participant must…',
          options: [
            'Abort after a timeout — it never heard COMMIT',
            'Commit after a timeout — YES votes usually mean commit',
            'Wait, holding its locks, until the coordinator\'s decision arrives — it can safely do neither on its own',
            'Re-run the vote with the remaining participants',
          ],
          correct: [2],
          explanation:
            'The YES vote handed the decision to the coordinator. Aborting risks diverging from a COMMIT; committing risks diverging from an ABORT. That forced waiting — locks held — is 2PC\'s famous blocking, and it is the price of atomicity.',
        },
        {
          q: 'Why can\'t a timeout let an in-doubt participant decide on its own?',
          options: [
            'Timeouts are too imprecise to configure correctly',
            'TCP would have already reported the failure',
            'Dead and slow are indistinguishable on an asynchronous network — a unilateral guess can produce both-committed and both-aborted histories',
            'Participants don\'t keep enough state to decide',
          ],
          correct: [2],
          explanation:
            'This is T0\'s failure-detector impossibility doing work. No response means "no response yet," never "dead" — so any timeout-based decision can guess wrong, and a wrong guess is exactly the non-atomic history 2PC exists to prevent.',
        },
        {
          q: 'Spanner and CockroachDB keep 2PC from blocking on coordinator failure by…',
          options: [
            'Using 3PC with tighter timeouts',
            'Refusing multi-shard transactions',
            'Storing the transaction record in a consensus-replicated log — Raft/Paxos per shard — so the group survives the dead node and a new leader finishes the decision',
            'Caching decisions on the client',
          ],
          correct: [2],
          explanation:
            'The coordinator role became replicated state. A dead "coordinator" is now a failover measured in election timeouts, not an in-doubt transaction with held locks. 2PC on top of consensus is the standard NewSQL architecture.',
        },
        {
          q: 'A saga replaces the atomic commit with…',
          options: [
            'A chain of local transactions plus compensating actions — made reliable by an outbox (at-least-once delivery) and idempotency keys on the receiving side',
            'Distributed locks held across services',
            '3PC with application-level votes',
            'Endless retries with no compensation',
          ],
          correct: [0],
          explanation:
            'No locks cross service boundaries, so nothing blocks on a dead coordinator — but a half-finished business operation must be *undone*, not rolled back: refund, cancel, un-reserve. Idempotency (T0.L4) is what makes the at-least-once relay safe.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Read the two canonical texts',
      md: `Kleppmann's *Designing Data-Intensive Applications*, chapter 9 — the "Distributed Transactions and Consensus" section — is the best honest treatment of 2PC written for practitioners, and it lands differently now that you can name every failure mode. Then the Spanner paper (OSDI 2012), section 4: watch TrueTime, Paxos groups, and 2PC compose into the architecture you just learned. Afterwards, hold up the mirror: which of the three modern answers is your own stack running? If it is Postgres plus Kafka plus a few services, you are in saga/outbox territory — whether anyone named it or not.`,
    },
  ],
}

export default lesson
