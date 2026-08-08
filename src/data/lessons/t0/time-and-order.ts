import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't0.l2',
  slug: 'time-and-order',
  trackId: 't0',
  index: 2,
  title: 'Time Is a Rumor: Clocks, Order, and Happens-Before',
  minutes: 20,
  hook: 'Two events on two machines: which was first? Your wall clock cannot tell you. Lamport clocks can — sort of. The precise answer is the foundation under every consistency argument in the course.',
  exercise: 'read+quiz',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `On one machine, "before" is free: a single clock orders everything. Across machines, each node has its own oscillator, its own drift, its own idea of noon. NTP keeps them within milliseconds-ish — and a millisecond is an eternity when two datacenters disagree about which write won. So distributed systems mostly *stop using wall clocks for correctness* and build logical order instead.

The key idea (Lamport, 1978): forget what time it *was*; track what *caused* what. Event A **happens-before** B if A can possibly influence B — same process order, or message sent → received. If neither A→B nor B→A holds, the events are **concurrent**: there is no fact of the matter about which came first, and any system claiming otherwise is lying to itself.`,
    },
    {
      type: 'prose',
      md: `## Lamport clocks: the two-line algorithm

Every node keeps a counter. On a local event: increment. On send: attach the counter. On receive: \`clock = max(local, received) + 1\`. That's the whole thing — and it gives you the partial order: if A happens-before B, then L(A) < L(B). The trap is the converse: **L(A) < L(B) does not mean A happened-before B.** Concurrent events get arbitrary numbers attached. Lamport time is a one-way proof: it can confirm causality, never deny it.

(Its descendants fix the direction: **vector clocks** keep a counter per node, so concurrency is detectable — Riak's sibling resolution, Dynamo's version vectors. The cost: one slot per node, forever. That's why production systems often cheat with synchronized wall clocks + uncertainty windows — Spanner's TrueTime, CockroachDB's HLC — which is just admitting Lamport was right with better hardware.)`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — three events, two machines, one honest answer',
      height: 50,
      nodes: [
        { id: 'a', x: 6, y: 8, w: 24, h: 9, label: 'A: write x=1', sub: 'node 1, L=3', color: '#22D3EE' },
        { id: 'b', x: 6, y: 32, w: 24, h: 9, label: 'B: read x → 1', sub: 'node 2, L=4 (after msg)', color: '#3EF2A4' },
        { id: 'c', x: 56, y: 20, w: 24, h: 9, label: 'C: write x=2', sub: 'node 3, L=1 — CONCURRENT', color: '#FBBF24' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'msg: causality' },
        { from: 'c', to: 'b', label: 'none — no path' },
      ],
      steps: [
        { caption: 'A → B: the message creates the edge. L(A)=3 < L(B)=4 — A genuinely happened-before B.', active: ['a', 'b'], edges: ['a->b'] },
        { caption: 'C has no path to or from A. L(C)=1 < L(A)=3 proves nothing — C is concurrent with A. The clock cannot order them; the system must resolve the conflict explicitly.', active: ['c', 'a'], edges: [] },
      ],
    },
    {
      type: 'prose',
      md: `## Why you care in production

Every consistency argument is an ordering argument. **Eventual consistency** = concurrent writes resolve however they resolve (last-writer-wins loses data quietly). **Linearizability** = the system pretends one global order exists and pays for the pretense in coordination (T1's quorum math). **Causal consistency** = preserve happens-before, allow concurrency otherwise — the middle point on the trade. And every time you've debugged a "the cache was stale" bug, you were watching two events race with no causal edge between them.

The exam-skill to take away: given two events, ask **"is there a message path?"** If yes, order exists. If no, anyone claiming an order is selling you a timeout.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      md: `This is your **CRDT/merge instinct** and your **git history** at once: git doesn't care when commits happened on wall clocks — it tracks *parentage*. A rebase conflict is exactly "these events are concurrent; resolve explicitly." And \`synchronized\` blocks in your JVM days were the same theorem on one box: no shared lock → no shared order → race.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'L(A) < L(B) for two Lamport timestamps means…',
          options: [
            'A happened-before B',
            'B happened-before A',
            'Possibly nothing — the implication only runs one way: causality implies smaller timestamps, but smaller timestamps prove nothing about causality',
            'The clocks are synchronized',
          ],
          correct: [2],
          explanation:
            'Lamport time is a one-way proof: A→B guarantees L(A)<L(B), but concurrent events get arbitrary relative values. You cannot infer order from the numbers alone — only a message path establishes it.',
        },
        {
          q: 'Two events are "concurrent" when…',
          options: [
            'They happen at the same time',
            'Neither can influence the other — no message path in either direction — so no fact of ordering exists between them',
            'They happen on one machine',
            'They fail',
          ],
          correct: [1],
          explanation:
            'Concurrency is about causality, not wall time. Two events a week apart are concurrent if neither could have learned of the other. This is why "latest timestamp wins" silently drops writes.',
        },
        {
          q: 'Vector clocks improve on Lamport clocks by…',
          options: [
            'Being smaller',
            'Keeping one counter per node, so concurrency becomes detectable (neither timestamp dominates) — at the cost of a slot per node',
            'Using wall time',
            'Removing the need for quorums',
          ],
          correct: [1],
          explanation:
            'A vector timestamp dominates another iff every component is ≥. Incomparable = concurrent — exactly the information Lamport clocks withhold. Riak/Dynamo used this for sibling detection.',
        },
        {
          q: 'Spanner\'s TrueTime and similar wall-clock schemes are best understood as…',
          options: [
            'Proof Lamport was wrong',
            'Buying causality with hardware: GPS/atomic clocks plus an explicit uncertainty window — paying latency to shrink "concurrent" to a few milliseconds',
            'A networking trick',
            'Only for Google',
          ],
          correct: [1],
          explanation:
            'They don\'t repeal causality — they bound uncertainty. The commit-wait latency IS the price of pretending a global clock exists. Same theorem, better oscillators.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'The paper worth the hour',
      md: `Lamport's "Time, Clocks, and the Ordering of Events in a Distributed System" (1978) is five pages of the highest-density systems thinking ever published, and it reads like it was written last year. Then Lamport's own follow-up you should know exists: the happens-before relation is *also* what Paxos's safety proof stands on — the two T1 lessons are this one, formalized.`,
    },
  ],
}

export default lesson
