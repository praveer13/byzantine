import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't1.l1',
  slug: 'leader-election',
  trackId: 't1',
  index: 1,
  title: 'One Leader Per Term: Elections and the Quorum',
  minutes: 25,
  hook: 'The whole of consensus reduces to one trick: any majority intersects any other majority. Raft\'s election is that trick plus heartbeats — and you will run one, break one, and fix one in The Cluster.',
  exercise: 'quiz+sim',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `T0 left you with ambiguity: nodes fail silently, networks split, clocks drift. Consensus is the protocol family that answers it — getting a set of unreliable machines to *agree on one value* (a leader, a log entry, a decision) and keep that agreement safe even while members crash. Everything you know by name — Paxos, Raft, Zab, Viewstamped Replication — is the same construction with different ergonomics.

Raft's version, in one breath: nodes are followers until a heartbeat timeout; a timed-out follower becomes a **candidate**, bumps its **term** (a logical epoch — T0.L2's clock, one per node shared via votes), and asks everyone for votes; a candidate with a **majority** becomes leader and starts sending heartbeats (AppendEntries). That's the entire election.`,
    },
    {
      type: 'prose',
      md: `## Why majority: the one trick

Why does a majority vote prove anything? Because **any two majorities overlap**. With 5 nodes, a majority is 3; two different majorities must share at least one node. That shared voter carries the memory of the last decision — so a new leader's majority *must contain* a node that saw the previous term's committed state. Every safety proof in Raft bottoms out here: the quorum intersection is what makes "committed" mean "will survive."

The costs are equally concrete: 5 nodes tolerate 2 failures (a majority must remain); an even split (2-3) means **nobody** has a majority and the system correctly refuses to decide — unavailability by design, because the alternative is two leaders and silent divergence. Split-brain isn't a bug that Raft forgot to handle; refusing it is the entire point.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — an election in four moves',
      height: 56,
      nodes: [
        { id: 'f1', x: 4, y: 22, w: 18, h: 9, label: 'follower', sub: 'heartbeat timeout!', color: '#FBBF24' },
        { id: 'c1', x: 28, y: 22, w: 18, h: 9, label: 'candidate', sub: 'term 4, votes for self', color: '#5CA8FF' },
        { id: 'votes', x: 52, y: 22, w: 20, h: 9, label: 'votes: 3 of 5', sub: 'majority reached', color: '#A78BFA' },
        { id: 'l1', x: 78, y: 22, w: 18, h: 9, label: 'leader', sub: 'heartbeats out', color: '#3EF2A4' },
      ],
      edges: [
        { from: 'f1', to: 'c1', label: 'timeout' },
        { from: 'c1', to: 'votes', label: 'RequestVote' },
        { from: 'votes', to: 'l1', label: 'majority' },
      ],
      steps: [
        { caption: 'No heartbeat for a randomized timeout: a follower self-promotes to candidate and bumps the term. Randomized timeouts are why two candidates don\'t tie forever.', active: ['f1', 'c1'], edges: ['f1->c1'] },
        { caption: 'The candidate asks all nodes. Votes are granted once per term, first-come — a node that already voted for someone else says no.', active: ['c1', 'votes'], edges: ['c1->votes'] },
        { caption: 'Majority (3/5) → leader. Any competing candidate lacked the votes — because majorities intersect and nodes vote once per term.', active: ['votes', 'l1'], edges: ['votes->l1'] },
      ],
    },
    {
      type: 'prose',
      md: `## The fine print that production bites with

- **The term is the fencing token.** Every message carries the sender's term; a stale-term leader gets told to step down by any node with a newer one. This is what stops last week's leader from writing after the partition heals — the distributed-lock version of the same idea.
- **Randomized election timeouts** (150–300 ms class) are load-bearing: fixed timeouts produce eternal split votes. Random spread makes one candidate usually finish before another starts.
- **A leader with a full log? Not so fast** — the completeness rule (voters reject candidates whose logs are behind) is what keeps committed entries safe across elections. The most consequential paragraph in the paper.
- **Availability is the price, on paper:** a 5-node cluster is dead when 3 are down. Majority systems trade availability for correctness — every "we run 3 nodes for HA" that loses 2 learns this.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      md: `Quorum intersection is your **optimistic-locking version check** scaled to a fleet: the version number is the term, the compare-and-swap is the once-per-term vote, and "two majorities must overlap" is why the check works at all. If you've implemented optimistic concurrency on a database row, you already believe in Raft — you just haven't run the proof.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A majority-based leader election is safe because…',
          options: [
            'Leaders are elected by seniority',
            'Any two majorities share at least one voter — so a new term\'s majority must contain a node that saw the previous term\'s committed state',
            'Majorities are fast',
            'It uses wall clocks',
          ],
          correct: [1],
          explanation:
            'Quorum intersection: with N nodes, two majorities of (N/2+1) must overlap. The shared voter carries memory forward — that is the entire safety argument in one line.',
        },
        {
          q: 'A 5-node cluster loses 3 nodes to a partition. The correct behavior is…',
          options: [
            'The remaining 2 elect a leader and keep serving',
            'Both sides elect leaders',
            'The remaining 2 refuse to elect a leader — correct unavailability, because deciding without a majority risks split-brain',
            'Failover to a backup cluster',
          ],
          correct: [2],
          explanation:
            'No majority → no decision. This is the trade, chosen on purpose: correctness over availability. A 5-node cluster tolerates 2 failures, not 3.',
        },
        {
          q: 'Election timeouts are randomized because…',
          options: [
            'Randomness is fun',
            'Fixed timeouts synchronize candidates — split votes would repeat forever; random spread makes one candidate usually finish first',
            'It saves CPU',
            'It prevents partitions',
          ],
          correct: [1],
          explanation:
            'Two candidates timing out together split the vote and both retry. Randomized timeouts stagger candidacies — the cheapest possible symmetry-breaker, and load-bearing.',
        },
        {
          q: 'The term number\'s deepest job is…',
          options: [
            'Counting elections',
            'Fencing: any node with a newer term forces a stale leader to step down — so last week\'s partitioned leader can\'t write after healing',
            'Logging',
            'Metrics',
          ],
          correct: [1],
          explanation:
            'The term is a fencing token — the same idea as your distributed lock\'s fencing token. Stale authority is rejected by comparing epochs. T0.L2\'s logical clock, doing work.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Now go break it',
      md: `Open The Cluster (/cluster): five nodes, one wire, knobs for loss, delay, and a partition knife. Watch an election happen; then split 2-from-3 and watch the minority refuse. Then read the actual paper — "In Search of an Understandable Consensus Algorithm" (Raft, Ongaro & Ousterhout, 2014) — and notice you already believe every paragraph. After that: any Jepsen analysis (jepsen.io) of a system you run. You will never read "strongly consistent" on a feature page the same way again.`,
    },
  ],
}

export default lesson
