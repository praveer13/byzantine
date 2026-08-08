import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't0.l1',
  slug: 'partial-failure',
  trackId: 't0',
  index: 1,
  title: 'The Network Lies: Partial Failure Is the Only Assumption',
  minutes: 20,
  hook: 'On one machine, failure is total: crash, restart, done. Across machines, failure is a Schrödinger state — and every distributed protocol is built to survive the ambiguity. This lesson rewires the instinct.',
  exercise: 'read+quiz',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `You have built services long enough to have opinions about p99. So start here: when your service calls another service and the response doesn't come back, you know *nothing*. The machine might be dead. The network might be dropping packets. The response might be sitting in a buffer, arriving. And the cruelest part — **the work might have happened anyway**. Your timeout fired at 200 ms; the write committed at 240 ms. You told the user it failed. It didn't.

That is partial failure, and it is the single fact that separates distributed systems from everything you've built on one box. On a single machine, failure is a total, observable event: the process is dead, the kernel tells you, end of story. Across machines, failure is **a guess under a deadline**. Every protocol in this course — every election, every retry, every quorum — is machinery for deciding what to believe when the answer is ambiguous.`,
    },
    {
      type: 'prose',
      md: `## The failure detector is not a thing

Your monitoring says "node is down." Your load balancer says "node is down." The node disagrees — it's just slow. Who's right? **Nobody can know.** This isn't a tooling gap; it's a theorem-shaped hole. In an asynchronous network (no bound on message delay), there is no way to distinguish *dead* from *slow* from *partitioned*. Fischer-Lynch-Paterson proved the sharp version: in a fully async system, no algorithm can guarantee consensus even with one crash failure. Everything practical — Paxos, Raft, every lease and heartbeat — is a workaround: **add clocks, add timeouts, accept probability instead of certainty.**

So the timeout is not a fact. It's a **bet**. Too short: you declare slow nodes dead and trigger elections/failovers constantly (the flapping tax). Too long: real failures take forever to notice (the availability tax). Every "aggressive timeout" incident review you've read is someone losing that bet in public.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '1985', label: 'FLP impossibility', hint: 'Fischer, Lynch, Paterson: no deterministic consensus in fully async systems with one crash failure.' },
        { value: '~3', label: 'states, not 2', hint: 'success / failure / "we have no idea" — the third state is where distributed systems live.' },
        { value: 'a bet', label: 'what a timeout is', hint: 'Not a fact: a wager on "dead" vs "slow".' },
        { value: '2×', label: 'the retry storm multiplier', hint: 'Ambiguous failure + naive retry = the load spike that takes the fleet down.' },
      ],
    },
    {
      type: 'prose',
      md: `## The shapes you'll meet in this course

Partial failure has a handful of recurring disguises, and the sim (The Cluster — open it after this lesson) lets you produce each one with a knife:

- **The partition:** the network splits; both halves are alive and both think the other half is dead. Each side's decisions are locally correct and globally contradictory.
- **The gray failure:** the node answers health checks but corrupts data, or answers slow enough that everyone times out on it differently.
- **The poison message:** one request that kills every worker that picks it up — retried, it becomes a fleet-wide rolling outage. (Your queue's dead-letter policy exists because of this one.)
- **The slow drift:** not failure at all — a GC pause or disk stall that makes one node behave *exactly like* a dead node, briefly, repeatedly.

The design reflex to grow: never ask "is it dead?" Ask **"what happens if I'm wrong about it being dead?"** That question, applied recursively, is most of this course.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      md: `You know this from **your database's transaction isolation**: a lock timeout doesn't tell you whether the other transaction is stuck, dead, or thinking. Your distributed lock manager (Redis redlock, anyone?) is the same bet with the same failure mode — and the same flame wars. The novelty here is zero: partial failure is what your infra already fights nightly. This course just stops pretending otherwise.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A request to another node times out. You can conclude…',
          options: [
            'The node is dead',
            'The network dropped the request',
            'Nothing certain — dead, slow, partitioned, and "completed but response lost" are indistinguishable',
            'The node is overloaded',
          ],
          correct: [2],
          explanation:
            'This is the whole lesson: the timeout tells you only that the deadline passed. The work may have happened. Every correct protocol is built to act despite that ambiguity — retries, dedup, quorums, fencing.',
        },
        {
          q: 'FLP impossibility says…',
          options: [
            'Consensus is always possible',
            'In a fully asynchronous system, no deterministic algorithm guarantees consensus if even one process can crash — so real systems add timeouts and accept probability',
            'Networks are unreliable',
            'Timeouts solve consensus',
          ],
          correct: [1],
          explanation:
            'The theoretical floor: pure async + one crash = no guaranteed consensus. Raft, Paxos, leases — all are workarounds that introduce clocks and timeouts to escape the model.',
        },
        {
          q: 'Setting aggressive failure-detection timeouts primarily risks…',
          options: [
            'Higher latency',
            'Declaring slow nodes dead — flapping: repeated elections, failovers, and duplicated work that can cost more than the failure',
            'Lower throughput',
            'Clock drift',
          ],
          correct: [1],
          explanation:
            'The timeout is a bet: short pays the flapping tax (false positives → unnecessary failovers), long pays the availability tax (slow to notice real deaths). The trade is unavoidable; pick it deliberately.',
        },
        {
          q: 'The correct reflex when a peer seems dead is…',
          options: [
            'Declare it dead and move on',
            'Retry until it answers',
            '"What happens if I am wrong about it being dead?" — then design for that case explicitly',
            'Alert the on-call',
          ],
          correct: [2],
          explanation:
            'Every decision under ambiguity is a bet. The senior move is to enumerate the wrong-guess consequences and make them safe: idempotent retries, fencing tokens, quorums — the rest of the course.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'The outage file',
      md: `Two recent production autopsies to read with this lens: **Cloudflare, Nov 18 2025** — a config file grew past a size limit, a component panicked, and the panic propagated through a distributed config pipeline: partial failure of one assumption became a global outage. **AWS us-east-1, Oct 2025** — a race between automated DNS enactors left an empty regional endpoint record; a regional data-plane race became a customer-visible collapse. Both are this lesson: an assumption that was *almost always true*, failing partially, propagating globally. The postmortems are free and better than most textbooks.`,
    },
  ],
}

export default lesson
