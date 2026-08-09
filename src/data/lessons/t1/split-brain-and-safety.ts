import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't1.l3',
  slug: 'split-brain-and-safety',
  trackId: 't1',
  index: 3,
  title: 'Split-Brain, Safety, and Why Committed Means Forever',
  minutes: 25,
  hook: 'The partition heals, and now there are two truths. Everything in Raft — terms, quorums, the completeness rule — exists to make that sentence impossible. This lesson assembles the proof.',
  exercise: 'quiz+sim',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `**Split-brain**, concretely: a partition isolates the leader with a minority of the cluster. The majority side stops hearing heartbeats, times out, bumps the term, and elects a new leader — correctly, by every rule from T1.L1. Now two nodes believe they lead, and clients that can still reach the old one keep sending it writes.

Here is the whole trick: **the old leader's writes don't commit.** Commit requires a majority (T1.L2), and the minority side is a majority of nothing. Those entries sit in the old leader's log, uncommitted and unacknowledged — the client saw a timeout, never a success. When the partition heals, the old leader meets a node carrying a higher term, steps down, and its uncommitted tail is truncated and overwritten by the new leader's log. That data loss is *legitimate*: uncommitted entries were promised to no one. The system chose correctness over availability twice, on purpose.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — a 2|3 partition and its two "leaders"',
      height: 52,
      nodes: [
        { id: 'a', x: 4, y: 10, w: 22, h: 10, label: 'A — old leader', sub: 'term 3, isolated', color: '#FBBF24' },
        { id: 'b', x: 4, y: 30, w: 22, h: 9, label: 'B — follower', sub: 'still hears A', color: '#5CA8FF' },
        { id: 'c', x: 72, y: 6, w: 24, h: 10, label: 'C — new leader', sub: 'term 4, 3 votes', color: '#3EF2A4' },
        { id: 'd', x: 72, y: 24, w: 24, h: 9, label: 'D — voter', sub: 'term 4', color: '#5CA8FF' },
        { id: 'e', x: 72, y: 42, w: 24, h: 9, label: 'E — voter', sub: 'term 4', color: '#5CA8FF' },
      ],
      edges: [
        { from: 'a', to: 'c', label: 'the cut' },
        { from: 'a', to: 'b', label: 'heartbeats' },
        { from: 'c', to: 'd', label: 'heartbeats' },
        { from: 'c', to: 'e', label: 'heartbeats' },
      ],
      steps: [
        { caption: 'Healthy: A leads term 3 and heartbeats to everyone. One wire dies between {A,B} and {C,D,E} — both sides alive, each convinced the other is gone.', active: ['a', 'c'], edges: ['a->c'] },
        { caption: 'C, D, E time out, bump to term 4, elect C with 3 votes — a real majority. A also still believes it leads. Two "leaders," one cluster: split-brain, tolerated deliberately.', active: ['a', 'c', 'd', 'e'], edges: ['c->d', 'c->e', 'a->b'] },
        { caption: 'Writes to A stall uncommitted: 2 of 5 is not a majority, and no ack is ever sent. Writes to C commit on {C,D,E} and are durable forever.', active: ['a', 'c'], edges: ['a->b', 'c->d', 'c->e'] },
        { caption: 'Heal: A sees term 4, steps down to follower, truncates its uncommitted tail, and adopts C\'s log. One truth survives — the majority\'s. The minority\'s writes were never promised.', active: ['a', 'c'], edges: ['a->c'] },
      ],
    },
    {
      type: 'prose',
      md: `## The safety chain, end to end

"Committed means forever" is not one property — it is a chain of three, each resting on the one below, with quorum intersection as the ground floor:

1. **Election safety — one leader per term.** A node votes once per term and majorities intersect, so two same-term leaders would require someone to vote twice. (T1.L1)
2. **Leader completeness — every future leader contains every committed entry.** A committed entry sits on a majority; any winning candidate's majority intersects it; and voters **reject candidates with staler logs** (lower last-term, or equal term with a shorter log). So the winner must already hold every committed entry. This is why the §5.4.2 current-term rule exists: it is what makes "on a majority" imply "in every future leader."
3. **State machine safety — applied means agreed.** If any node has applied an entry at an index, no node ever applies a different entry at that index. It follows from (2) plus the log matching property: every leader carries the committed prefix, and followers only ever append a leader's log.

Break any link and "committed" stops meaning anything. Each link is one rule you can point to in the paper — and a few lines of code you will write in labs 04–05.`,
    },
    {
      type: 'prose',
      md: `## What breaks in the real world

The proof assumes honest machinery. Production supplies dishonest machinery:

- **Configuration changes during partitions.** Membership is itself log-replicated for a reason: a naive "add a node" mid-partition can mint two overlapping majorities that don't intersect. Raft's joint-consensus dance exists because people got exactly this wrong in production.
- **Disks lie.** The protocol assumes \`voted_for\`, term, and log survive a crash. An fsync that returns before the platter has it — or a RAID controller reordering writes — lets a node vote twice in one term or resurrect a truncated entry. Safety proofs do not cover perjury.
- **Clock jumps stretch leases.** Any "the leader may serve reads alone for 5 s" optimization is a bet on monotonic clocks. NTP stepping a clock has turned lease-based reads into stale reads at companies you have heard of.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'war story: the majority that wasn\'t',
      md: `Jepsen's analyses of etcd and Consul are this lesson with a billing address: systems running real consensus protocols still served **stale reads** and lost acknowledged writes when defaults quietly skipped the safety chain — reads answered by a leader that never confirmed it still held a majority, persistence weaker than the docs implied. The failure mode is never "the algorithm was wrong." It is always "an assumption the proof needed was false in production." Operating consensus means defending the assumptions.`,
    },
    {
      type: 'prose',
      md: `## Snapshots: the log's epilogue

The log grows forever unless you cut it. Once a prefix is committed and applied, the *state* already contains everything those entries were for — the entries themselves are redundant. **Snapshotting** replaces a committed prefix with one opaque blob plus a seam: \`last_included_index\` and \`last_included_term\`.

Two rules keep it safe:

- **A snapshot covers committed entries only.** Installing a snapshot replaces the follower's log prefix wholesale — baking uncommitted entries into one would promote entries that leader churn is entitled to erase into permanent state. The seam's term exists so the log-matching check still works across the cut.
- **A hopelessly-behind follower skips the log.** When the leader's log no longer reaches back to the follower's position — compacted away — the leader sends **InstallSnapshot**: "here is the state as of index N; resume at N+1." Laggard recovery becomes a file transfer instead of a ten-thousand-entry replay.

Lab 05 (snapshots) is exactly this: implement \`compact(cut)\` on the leader and InstallSnapshot handling on the follower, then watch a partitioned laggard catch up in one message.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'During a 2|3 partition, clients keep writing to the isolated old leader on the minority side. Those writes…',
          options: [
            'Commit on the minority side and survive the heal',
            'Commit locally but get rolled back when the partition heals',
            'Never commit — 2 of 5 is no majority — and are legitimately overwritten when the heal forces the old leader to adopt the new leader\'s log',
            'Block until the partition heals, then commit',
          ],
          correct: [2],
          explanation:
            'Commit requires a majority, full stop. Uncommitted entries were never acknowledged to any client, so discarding them on leader churn is not data loss — it is the protocol keeping its promises.',
        },
        {
          q: 'Leader completeness — "every future leader contains every committed entry" — follows from…',
          options: [
            'Leaders syncing their logs before starting an election',
            'A committed entry sitting on a majority, every winning majority intersecting it, and voters rejecting candidates whose logs are staler',
            'Heartbeats carrying the full log to every follower each round',
            'Term numbers increasing monotonically across elections',
          ],
          correct: [1],
          explanation:
            'Quorum intersection puts a witness of every committed entry inside any winning coalition, and the freshness check (compare last-term, then last-index) makes that witness refuse to vote for a candidate missing it.',
        },
        {
          q: 'State machine safety guarantees…',
          options: [
            'Every node applies entries at the same wall-clock time',
            'If any node has applied an entry at index i, no node ever applies a different entry at index i',
            'Committed entries are never included in snapshots',
            'Leaders never crash between commit and apply',
          ],
          correct: [1],
          explanation:
            'Per-index agreement for applied entries is the end of the chain: election safety → leader completeness → state machine safety. Timing and crash-freedom are explicitly not promised.',
        },
        {
          q: 'A snapshot must cover committed entries only, because…',
          options: [
            'Uncommitted entries are too large to serialize',
            'InstallSnapshot replaces the follower\'s log prefix wholesale — snapshotting uncommitted entries would make erasable state permanent',
            'Committed entries compress better than uncommitted ones',
            'The last_included_term seam only validates committed entries',
          ],
          correct: [1],
          explanation:
            'A snapshot is a claim of permanence. Uncommitted entries may still be legitimately overwritten by a future leader; sealing one into a snapshot would resurrect state the protocol had the right to erase.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Two truths, one survivor',
      md: `Open The Cluster (/cluster): split 2-from-3, write on both sides, heal. Watch which writes survive — the majority side's commits persist, the minority side's uncommitted tail evaporates, and no client was ever told "success" for the entries that died. Then read the autopsies: Jepsen's analyses of **etcd** and **Consul** (jepsen.io) — production consensus deployments failing on exactly this lesson's assumptions: partitions, persistence, and defaults that quietly traded safety for latency.`,
    },
  ],
}

export default lesson
