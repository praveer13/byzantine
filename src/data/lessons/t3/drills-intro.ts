import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't3.l3',
  slug: 'drills-intro',
  trackId: 't3',
  index: 3,
  title: 'Incident Drills: Reading a Dying Cluster',
  minutes: 15,
  hook: 'Dashboards lie politely during a partition; the drill is learning what to look at first.',
  exercise: 'quiz',
  blocks: [
    {
      type: 'prose',
      md: `During a real incident you do not get to re-run the paper. You get a page, a wall of metrics, logs from machines that may be lying to you, and a decision with a clock on it. There is no pause button and no rewind — the two things The Cluster gave you for free. So diagnosis has to be something else: **pattern-matching against failure modes you have already seen in simulation.**

That is, quietly, the skill this whole course was building. Every fault you injected by hand — the partition knife, the dropped messages, the killed leader — was a flashcard. This lesson names the patterns, gives you the order to check them in, and then points you at the exam.`,
    },
    {
      type: 'prose',
      md: `## The diagnostic grammar

Five failure modes, each with a signature you have watched happen:

- **Split-brain** — two nodes claim leadership (in different terms), commit indexes on the two sides stop sharing a prefix, writes get acknowledged on both sides. The cause is always a fencing failure: a stale leader that never learned about the newer term. This one corrupts data; it outranks everything else.
- **Quorum loss** — a perfectly healthy leader, zero progress. Appends failing against unreachable followers; the majority-less side cycling through elections that can never succeed. The system is *correctly* unavailable. The bug, if any, is in the network, not the leader.
- **Stale reads** — clients get old committed values; one follower's applied index lags far behind; the same key returns different answers from different endpoints. The read path bypassed the leader (or a lease), and a lagging replica answered from the past.
- **Flapping** — leadership changes every few seconds; logs show a metronome of term bumps with no progress between them. The failure detector is too eager for the real latency: election timeout below actual RTT, or a GC pause longer than the timeout. T0.L3, in production clothes.
- **Retry storms** — a partial outage amplified by clients retrying without backoff or idempotency. Leader CPU and queue depth climb *together*; the cluster is down because the clients are holding it down. T0.L4's lesson, at 10x traffic.`,
    },
    {
      type: 'prose',
      md: `## What to check first, in order

When the page fires, resist the dashboards and answer four questions, in this order:

1. **Is there exactly one leader — and does everyone agree which term it leads?** Split-brain corrupts data; everything else only costs time. Kill the worst case first.
2. **Is a quorum reachable?** This decides whether you are waiting out a correct stall or failing over. No majority means no amount of restarting helps.
3. **Are commit indexes advancing on a majority?** Progress versus stall, in one number. A leader with a frozen commit index is a queue filling up, not a database.
4. **Where is the partition boundary — who can talk to whom?** Every other metric is noise until the topology is known; reachability reframes every other observation.

Everything else — CPU graphs, slow-query logs, disk latency — is noise until those four answer. The order is the lesson: safety first, then liveness, then topology, then and only then the noise.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Dashboards lie politely',
      md: `During a partition, every dashboard tells the truth *from one side of the wall*. A minority-side leader happily reports "I am leader, 0 of 4 followers reachable" and its own row stays green; the client metrics on the other side say every request times out. Neither is lying — both are local. **Never diagnose from a single vantage point.** The first question about any metric is not "is it bad?" but "who could see this, and what couldn't they see?"`,
    },
    {
      type: 'prose',
      md: `## The drills

The [Partition Drills](/drills) page is three scripted incidents with static telemetry: leader/term tables, commit indexes, a reachability matrix, client metrics — the same evidence you'd get from a real dying cluster, frozen so you can take your time. For each one: read the telemetry cards, call the diagnosis out loud (to yourself, to a colleague, to a rubber duck — out loud matters), and only then reveal the answer.

Treat it as the oral exam for the whole course. Every drill is built from failure modes you have personally injected: if the telemetry feels familiar, that's not the drills being easy — that's the course having worked.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'Telemetry: two nodes report state=leader, in terms 7 and 9. Commit indexes on the two sides no longer share a prefix. Both sides are acknowledging writes. Diagnosis?',
          options: [
            'Quorum loss — the cluster needs a restart',
            'Flapping — tighten the election timeout',
            'Split-brain — the term-7 leader never stepped down; fencing failed. Fix the fencing, not the heartbeats',
            'A retry storm — shed client load',
          ],
          correct: [2],
          explanation:
            'Two live leaders in different terms plus diverging commit indexes is the split-brain signature. A partitioned leader that never saw the newer term keeps serving — terms exist to fence exactly this, so something in the fencing path is broken.',
        },
        {
          q: 'Telemetry: leadership has changed 40 times in two hours. Node-to-node RTT occasionally spikes to 400 ms. Election timeout is 300 ms. Diagnosis?',
          options: [
            'Flapping — the failure detector is too eager: every latency spike trips the timeout and starts a new term before the previous leader can get anything done',
            'Split-brain — two leaders are fighting',
            'Quorum loss — a majority is unreachable',
            'Slow disk on the leader',
          ],
          correct: [0],
          explanation:
            'An election timeout below real-world latency turns ordinary jitter into perpetual elections. The fix is T0.L3: give the detector a timeout that matches measured latency (or fix the pauses), not more elections.',
        },
        {
          q: 'Telemetry: reads of the same key return 42 from the leader, 42 from follower A, 17 from follower B. B\'s applied index is 40 entries behind. Reads are served by any replica. Diagnosis?',
          options: [
            'Split-brain — B belongs to a diverged side',
            'A lost write — the leader dropped an entry',
            'Clock skew on the clients',
            'Stale reads — a lagging follower is answering from an old committed state; reads must go through the leader, a lease, or a read-index check',
          ],
          correct: [3],
          explanation:
            'Different answers per endpoint plus a lagging applied index is the stale-read signature. The data is safe in the log; the read path is what\'s wrong — it bypassed the ordering authority and got the past.',
        },
        {
          q: 'Telemetry: the leader is alive and healthy. No new entries are committing. Two of five nodes are unreachable from it; the unreachable side keeps starting elections that all fail. Diagnosis?',
          options: [
            'Split-brain — promote the unreachable side immediately',
            'Quorum loss — correct unavailability: three nodes can\'t form a majority, the two can\'t elect anyone; verify reachability and restore the partition, don\'t force a leader',
            'A leader bug — restart the leader',
            'A retry storm — the failing elections are client load',
          ],
          correct: [1],
          explanation:
            'One leader, no divergence, no progress, and a minority that can never win an election: the cluster is doing exactly what Raft promises when a majority is lost. Restarting or force-promoting converts a clean stall into split-brain.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'The oral exam is waiting',
      md: `Go to [/drills](/drills) and take all three incidents. Read the telemetry before touching the answer — the discipline is the point. Then take one final pass through [The Cluster](/cluster) with the drills' questions in your head: inject a partition, cover the visualization, and ask the telemetry the four questions in order — one leader? quorum? commit indexes moving? who can talk to whom? If you can answer all four from the numbers alone, you're done here. You came in with "the network lies"; you leave reading a dying cluster like a chest X-ray.`,
    },
  ],
}

export default lesson
