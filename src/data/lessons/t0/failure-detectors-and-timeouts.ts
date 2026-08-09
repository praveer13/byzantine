import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't0.l3',
  slug: 'failure-detectors-and-timeouts',
  trackId: 't0',
  index: 3,
  title: 'Failure Detectors and the Price of a Timeout',
  minutes: 25,
  hook: 'A timeout is not a measurement; it is a guess you are about to act on. Act too early and you fail over a live node; act too late and your users find the corpse first. This lesson prices both mistakes.',
  exercise: 'quiz+sim',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `T0.L1 left you with the ambiguity: when the response never comes back, *dead*, *slow*, and *partitioned* are indistinguishable. That is not a tooling gap — it is the FLP result in street clothes. In an asynchronous network there is no bound on message delay, so any missing reply might simply still be in flight. No algorithm, however clever, can look at silence and know the difference.

So how does anything ever get declared dead? With a **failure detector** — the honest name for the only construction available: a timer plus a guess. Heartbeats go out; when the gap since the last one crosses a deadline, the detector *bets* the node is gone. The output is not a fact about the peer. It is a decision you chose to make, with a price attached to being wrong in each direction.`,
    },
    {
      type: 'prose',
      md: `## The anatomy of a timeout

Set the deadline **too short** and you pay in false positives. A slow node gets declared dead; a failover or election fires; then the "corpse" wakes up mid-transition and now two machines think they own the same resource. Worse, the failover itself moves load — the standby takes the dead node's traffic, slows down, and trips the *next* detector. That is the cascading-failover incident: one GC pause, three promotions, a fleet on its knees. The industry word is **flapping**.

Set it **too long** and you pay in availability. A genuinely dead node keeps its traffic until the deadline passes — every request routed to it burns its own timeout before erroring out. Detection time is user-visible error time.

There is no correct value; there is a **trade, chosen per system**. HDFS waits minutes before declaring a DataNode dead, because the blocks are replicated and haste only wastes re-replication bandwidth. A lock service detects in seconds and fences brutally, because a stale lock holder corrupts data. Same mechanism, opposite knobs, both right.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the detector loop: silence in, decision out',
      height: 52,
      nodes: [
        { id: 'hb', x: 4, y: 20, w: 20, h: 10, label: 'heartbeats', sub: 'every ~500 ms', color: '#22D3EE' },
        { id: 'fd', x: 30, y: 20, w: 20, h: 10, label: 'failure detector', sub: 'timer + guess', color: '#FBBF24' },
        { id: 'sus', x: 56, y: 20, w: 17, h: 10, label: 'suspect', sub: 'not proof', color: '#A78BFA' },
        { id: 'act', x: 78, y: 20, w: 18, h: 10, label: 'fence, then act', sub: 'failover / election', color: '#3EF2A4' },
      ],
      edges: [
        { from: 'hb', to: 'fd', label: 'gap grows' },
        { from: 'fd', to: 'sus', label: 'deadline passes' },
        { from: 'sus', to: 'act', label: 'decide' },
      ],
      steps: [
        { caption: 'Heartbeats stop arriving — or stop arriving on time. The detector knows only one thing: how long since the last sign of life.', active: ['hb', 'fd'], edges: ['hb->fd'] },
        { caption: 'The deadline passes. Suspicion is raised — but remember, a 30-second GC pause produces exactly this signal on a healthy node.', active: ['fd', 'sus'], edges: ['fd->sus'] },
        { caption: 'You act on the guess. Because the guess may be wrong, the first action is always fencing the "dead" node — then failover.', active: ['sus', 'act'], edges: ['sus->act'] },
      ],
    },
    {
      type: 'prose',
      md: `## φ: suspicion as a number, not a bit

A binary dead/alive verdict forces one timeout to serve every consumer. The **φ (phi) accrual failure detector** — the one inside Akka and Cassandra — refuses the binary. It samples the inter-arrival times of past heartbeats, builds a statistical model of the network's *actual* delay behavior, and outputs a continuous **suspicion level**: φ(t) = −log10(1 − F(t)), where F is the observed distribution of heartbeat gaps. Practically: the longer the silence compared to *usual*, the higher φ climbs — and on a jittery network it climbs slower, because silence there proves less.

Two wins fall out:

- **Detection adapts to the network you have**, not the one a config file assumed on the day of installation. A WAN link and a rack-local switch need different deadlines; φ derives both from observation.
- **Consumers pick their own threshold.** Monitoring pages a human at φ 8; automated failover waits for φ 12. The detector emits evidence; the policy stays yours.

The transport under all of this is usually **gossip**: each node periodically forwards what it knows about everyone's heartbeats to a few random peers. No central pinger to become a bottleneck or a single point of blindness, and detection survives the failure of any one link.`,
    },
    {
      type: 'prose',
      md: `## What production actually does

TCP already detects failure — retransmit, back off, give up, reset. It is nearly useless for the job: its give-up times are minutes (geological, for a web request), and a perfectly healthy TCP connection tells you nothing about a process that is alive, accepting, and silently dropping everything on the floor. So every serious system heartbeats at the **application layer** and treats the OS's opinion as advisory.

And notice what the detector's verdict is *for*. You never act on suspicion directly — you **detect, then fence, then take over**. Before the standby promotes, the old master is fenced: kill its power (STONITH), revoke its lease, or bump the epoch so its writes get rejected downstream. The fencing step exists precisely because this lesson's premise is that the suspicion might be wrong.

The false-positive story that never stops being true: a stop-the-world GC pause, a VM live-migration, a noisy neighbor on the disk. For thirty seconds the node emits nothing, and to every peer it is *exactly* a crash. Then it wakes up, still believing it is the leader, and starts writing — split-brain from a garbage collector. **This is why T1's elections carry terms and fencing tokens:** the detector is allowed to guess wrong; the epoch is what makes a stale guess harmless.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The GC pause is indistinguishable from death',
      md: `A full stop-the-world collection freezes heartbeats, threads, timers — everything. From the network's side, the machine might as well be powered off. If your failure-detection timeout is shorter than your worst-case GC pause, you have built a machine that triggers failover every time garbage is collected. Production teams tune GC *or* raise φ thresholds; both are admissions that the detector cannot know, and the protocol must survive its mistakes.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A heartbeat deadline passes with no sign of life. The failure detector has learned…',
          options: [
            'The node has crashed',
            'The network is partitioned',
            'Nothing certain — dead, slow, GC-paused, and partitioned all produce identical silence; the detector\'s verdict is a decision, not a fact',
            'The node is overloaded',
          ],
          correct: [2],
          explanation:
            'This is FLP applied: in an async network, silence has no unique cause. A failure detector converts ambiguity into a guess with a deadline — which is why everything downstream of it (fencing, terms) is designed to survive a wrong guess.',
        },
        {
          q: 'The primary cost of an aggressively short timeout is…',
          options: [
            'Higher CPU usage on peers',
            'False positives — slow nodes declared dead, triggering flapping failovers whose load spikes trip further detectors (cascading failure)',
            'Slower detection of real crashes',
            'Clock drift across the fleet',
          ],
          correct: [1],
          explanation:
            'Short timeouts buy fast detection of real failures and pay for it with false positives. The failover itself adds load, which slows the next node, which trips the next detector — the cascade is the false positive\'s second act.',
        },
        {
          q: 'A φ accrual detector (Akka, Cassandra) beats a fixed timeout because…',
          options: [
            'It removes the need for heartbeats',
            'It guarantees no false positives',
            'It outputs a suspicion level computed from observed heartbeat-delay variance — so detection adapts to the actual network, and different consumers can set different thresholds',
            'It uses synchronized wall clocks',
          ],
          correct: [2],
          explanation:
            'φ measures how improbable the current silence is, given the delay distribution the system has actually observed. Jittery networks produce slower-rising suspicion — and monitoring can react at φ 8 while failover waits for φ 12.',
        },
        {
          q: 'Before promoting a standby, correct systems fence the old master because…',
          options: [
            'It frees the old master\'s memory',
            'The suspicion may be wrong — fencing (revoking the lease, bumping the epoch) guarantees a still-alive old master cannot keep writing after the takeover',
            'It speeds up the failover',
            'It prevents network partitions',
          ],
          correct: [1],
          explanation:
            'Detect-then-fence is the failure detector\'s apology for being a guess. If the "dead" node is merely paused, only fencing — an epoch downstream readers check — stands between you and split-brain. T1 builds its whole safety story on this.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Watch the guess get made',
      md: `Open The Cluster (/cluster) and turn packet loss to 10%. Nobody is dead, yet heartbeat timeouts start firing elections — you are watching false positives happen to healthy nodes. Now set loss to 0 and kill a node outright: identical symptom, opposite reality. Then raise the election timeout and watch real failures take longer to route around — the availability tax, live. Every knob in that sim reprices the same bet you just read about.`,
    },
  ],
}

export default lesson
