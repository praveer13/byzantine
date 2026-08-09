/**
 * Partition Drills — three scripted incident cards (T3.L3's oral exam).
 * Static telemetry, no wasm: the student reads the curves, calls the root
 * cause and the mitigation. Adapted from the platform's Fleet Week
 * incident-card pattern.
 */

export interface DrillOption {
  id: string
  label: string
  correct: boolean
}

export interface DrillSeries {
  label: string
  color: string
  values: number[]
}

export interface DrillIncident {
  id: string
  title: string
  briefing: string
  telemetry: DrillSeries[]
  causes: DrillOption[]
  mitigations: DrillOption[]
  /** shown after the correct call — the "what just happened" paragraph */
  debrief: string
}

const flat = (v: number, n: number) => Array.from({ length: n }, () => v)
const ramp = (from: number, to: number, n: number) =>
  Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)))
const step = (before: number, after: number, at: number, n: number) =>
  Array.from({ length: n }, (_, i) => (i < at ? before : after))
const spikes = (base: number, peak: number, at: number[], n: number) =>
  Array.from({ length: n }, (_, i) => (at.includes(i) ? peak : base))

export const DRILLS: DrillIncident[] = [
  {
    id: 'stale-leader',
    title: 'INC-1 — The Leader That Wouldn\'t Die',
    briefing:
      'Five-node Raft KV behind an L7 load balancer. At 14:02 a top-of-rack switch fails, isolating two nodes — including the leader — from the other three. The majority side elects a new leader within seconds and keeps serving. But the LB\'s health check ("are you up?") still passes on the isolated leader, so a slice of client traffic keeps landing there. Those clients get 200 OKs on their writes. At 14:09 the switch is replaced, the partition heals — and a support channel fills up: "my write succeeded, where is it?"',
    telemetry: [
      { label: 'leader changes', color: '#A78BFA', values: spikes(0, 1, [2], 24) },
      { label: 'commit idx (majority)', color: '#3EF2A4', values: [...flat(120, 2), ...ramp(120, 240, 22)] },
      { label: 'commit idx (isolated leader)', color: '#FBBF24', values: flat(120, 24) },
      { label: 'writes acked by isolated side', color: '#FB7185', values: step(0, 14, 2, 24) },
    ],
    causes: [
      { id: 'a', label: 'Network partition; the isolated leader kept accepting writes it could never commit — and read its own uncommitted tail back to clients', correct: true },
      { id: 'b', label: 'Disk corruption on the isolated leader ate the writes', correct: false },
      { id: 'c', label: 'Raft bug: two leaders existed in the SAME term', correct: false },
      { id: 'd', label: 'Client retry logic duplicated and then dropped the writes', correct: false },
    ],
    mitigations: [
      { id: 'a', label: 'Serve reads and ack writes only from committed state; fence by term so a stale leader steps down on first contact with the new term', correct: true },
      { id: 'b', label: 'Restart the isolated leader as soon as the partition is detected', correct: false },
      { id: 'c', label: 'Raise the election timeout so partitions elect fewer leaders', correct: false },
      { id: 'd', label: 'Add a sixth node so partitions are less likely', correct: false },
    ],
    debrief:
      'No majority, no commit: the isolated leader\'s log entries never reached a quorum, so they were never durable — the 200 OKs were the lie. When the partition healed, the new leader\'s log (higher term) won and the phantom entries were truncated away. The fix is on the read/write path, not the network: a response is a proof. Writes ack after commit; reads answer from committed state only. This is exactly what the linearizable-kv lab grades.',
  },
  {
    id: 'quorum-loss',
    title: 'INC-2 — No Progress Is Correct Progress',
    briefing:
      'A rack power event takes down three of five nodes at 09:41. Within a minute the on-call channel heats up: all writes are timing out, and the survivors\' logs show election after election — terms 12, 13, 14, no winner. Someone pastes a runbook line: "force a new cluster from surviving members." Someone else says the election code must be broken because it keeps retrying. The graphs say otherwise.',
    telemetry: [
      { label: 'current term (survivors)', color: '#A78BFA', values: ramp(11, 38, 24) },
      { label: 'elections started', color: '#FBBF24', values: ramp(0, 26, 24) },
      { label: 'votes per election (max)', color: '#FB7185', values: flat(2, 24) },
      { label: 'commit idx advance', color: '#3EF2A4', values: flat(0, 24) },
    ],
    causes: [
      { id: 'a', label: 'Quorum loss: 2 of 5 can never reach the 3-vote majority — elections cycle correctly and the system refuses to decide', correct: true },
      { id: 'b', label: 'Election bug: randomized timeouts are misfiring, causing endless split votes', correct: false },
      { id: 'c', label: 'A partial network partition is letting votes through one-way only', correct: false },
      { id: 'd', label: 'Disk-full on the survivors is blocking the vote RPCs', correct: false },
    ],
    mitigations: [
      { id: 'a', label: 'Restore or replace one failed member through the normal reconfiguration path — availability returns with the third vote', correct: true },
      { id: 'b', label: 'Edit config on the 2 survivors to shrink the quorum to 2 and force-elect a leader now', correct: false },
      { id: 'c', label: 'Restart both survivors to clear the stuck elections', correct: false },
      { id: 'd', label: 'Roll both survivors back to the last snapshot and rejoin', correct: false },
    ],
    debrief:
      'Two votes out of five is not a majority, and majorities are the entire mechanism: every election failing is the protocol working as designed, trading availability for correctness. The dangerous move is the "force a new cluster" shortcut — shrink the quorum by hand and, when the powered-off rack returns, you have two clusters that each believe they are the system. That is how split-brain is manufactured. Membership change is a consensus operation, not an emergency edit.',
  },
  {
    id: 'flapping-leader',
    title: 'INC-3 — The Flapping Leader',
    briefing:
      'Since last week\'s change window, the cluster changes leader twenty times an hour. Throughput is a sawtooth: every new leader spends its first seconds re-syncing followers, then gets deposed before settling in. The change window\'s diff is one line: election timeout lowered from 1500 ms to 500 ms, "for faster failover." The nodes run on a JVM; p99 GC pause on the data path measures 900 ms. The network is clean.',
    telemetry: [
      { label: 'leader changes / min', color: '#A78BFA', values: spikes(0, 3, [3, 7, 11, 15, 19, 23], 24) },
      { label: 'heartbeat latency p99 (ms)', color: '#FB7185', values: spikes(120, 900, [5, 9, 13, 17, 21], 24) },
      { label: 'election timeout (ms)', color: '#FBBF24', values: flat(500, 24) },
      { label: 'commit idx advance', color: '#3EF2A4', values: [4, 4, 4, 0, 2, 2, 5, 5, 0, 3, 3, 6, 6, 0, 2, 4, 4, 0, 3, 3, 5, 5, 0, 2] },
    ],
    causes: [
      { id: 'a', label: 'The 500 ms election timeout sits below the 900 ms p99 GC pause — every long pause looks like a dead leader, and the false positive triggers a real election', correct: true },
      { id: 'b', label: 'Network loss is dropping heartbeats between specific node pairs', correct: false },
      { id: 'c', label: 'Disk latency is delaying log appends past the replication deadline', correct: false },
      { id: 'd', label: 'Client load is overwhelming the leaders into resignation', correct: false },
    ],
    mitigations: [
      { id: 'a', label: 'Move the timeout above the measured pause tail (or adopt an accrual/phi-style detector) — and tune the GC pauses themselves', correct: true },
      { id: 'b', label: 'Add more nodes to spread the heartbeat load', correct: false },
      { id: 'c', label: 'Upgrade to faster disks so appends finish sooner', correct: false },
      { id: 'd', label: 'Disable heartbeats during GC pauses', correct: false },
    ],
    debrief:
      'A failure detector is a timeout plus a guess, and this guess was priced wrong: "slow" and "dead" are indistinguishable on an async network, so a 900 ms pause under a 500 ms suspicion threshold is a crash as far as the protocol knows. Each false positive costs a full election — and a leader change is not free, it interrupts commit progress cluster-wide. Detection speed and stability are the same knob; you set it against the measured tail of your pauses, not against how fast you wish failover felt.',
  },
]
