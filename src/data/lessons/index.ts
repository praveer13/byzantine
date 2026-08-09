/**
 * Lesson registry — byzantine content source of truth.
 * Track ids: t0 (Failure & Time), t1 (Consensus), t2 (Consistency &
 * Transactions), t3 (Production Anatomy).
 */

import type { LucideIcon } from 'lucide-react'
import { Network } from 'lucide-react'
import type { Lesson, SimId, TrackId } from './types'

// T0 — Failure & Time
import t0l1 from './t0/partial-failure'
import t0l2 from './t0/time-and-order'
import t0l3 from './t0/failure-detectors-and-timeouts'
import t0l4 from './t0/retries-idempotency'

// T1 — Consensus
import t1l1 from './t1/leader-election'
import t1l2 from './t1/raft-replication'
import t1l3 from './t1/split-brain-and-safety'

// T2 — Consistency & Transactions
import t2l1 from './t2/consistency-models'
import t2l2 from './t2/distributed-transactions'

// T3 — Production Anatomy
import t3l1 from './t3/production-anatomy'
import t3l2 from './t3/reading-jepsen'
import t3l3 from './t3/drills-intro'

export const LESSONS_BY_TRACK: Record<TrackId, Lesson[]> = {
  t0: [t0l1, t0l2, t0l3, t0l4],
  t1: [t1l1, t1l2, t1l3],
  t2: [t2l1, t2l2],
  t3: [t3l1, t3l2, t3l3],
}

export const TRACK_IDS: TrackId[] = ['t0', 't1', 't2', 't3']

/** All lessons in curriculum order. */
export const ALL_LESSONS: Lesson[] = TRACK_IDS.flatMap((id) => LESSONS_BY_TRACK[id])

export const TOTAL_LESSON_COUNT = ALL_LESSONS.length

/** Canonical ids in curriculum order — for next-recommended selectors. */
export const ORDERED_LESSON_IDS: string[] = ALL_LESSONS.map((l) => l.id)

const byIdMap = new Map<string, Lesson>()
for (const l of ALL_LESSONS) {
  byIdMap.set(l.id, l)
  byIdMap.set(l.slug, l)
}

/** Resolve a lesson by canonical id (`t1.l1`) or slug (`leader-election`). */
export function lessonById(idOrSlug: string | undefined): Lesson | undefined {
  if (!idOrSlug) return undefined
  return byIdMap.get(idOrSlug)
}

export function lessonsForTrack(trackId: string): Lesson[] {
  return LESSONS_BY_TRACK[trackId as TrackId] ?? []
}

/** Next lesson in curriculum order — crosses track boundaries. */
export function nextLesson(lesson: Lesson): Lesson | undefined {
  const i = ORDERED_LESSON_IDS.indexOf(lesson.id)
  return i >= 0 ? lessonById(ORDERED_LESSON_IDS[i + 1]) : undefined
}

/** Previous lesson in curriculum order — crosses track boundaries. */
export function prevLesson(lesson: Lesson): Lesson | undefined {
  const i = ORDERED_LESSON_IDS.indexOf(lesson.id)
  return i > 0 ? lessonById(ORDERED_LESSON_IDS[i - 1]) : undefined
}

/** Route helper — canonical lesson URL. */
export const lessonPath = (l: Lesson) => `/lesson/${l.id}`

/* ---------------------- track extras ---------------------- */

export interface TrackExtras {
  pitch: string
  outcomes: string[]
  requires: string
  sideNote: string
}

export const TRACK_EXTRAS: Record<TrackId, TrackExtras> = {
  t0: {
    pitch:
      'Partial failure and unsynchronized clocks are the two facts every distributed system is built around. Once you stop assuming the network answers and the clock agrees, the protocols start making sense.',
    outcomes: [
      'Explain why "the other machine is down" is indistinguishable from "the network is slow".',
      'Choose timeouts with the trade they actually are: availability vs correctness.',
      'Order events with happens-before and Lamport clocks — and know what they cannot tell you.',
      'Make retries safe: idempotency keys, dedup tables, and backoff with jitter.',
    ],
    requires: 'base of the stack · no prerequisites',
    sideNote: '// lesson 1 is the one that rewires your instincts',
  },
  t1: {
    pitch:
      'Consensus, from first ballot to full Raft: elections, quorums, log replication, and the safety arguments that keep committed writes alive through partitions.',
    outcomes: [
      'Prove to yourself why a majority quorum intersects any other.',
      'Walk a Raft election, a replication round, and a leader change without losing a committed entry.',
      'Explain why a leader may only commit current-term entries by counting replicas.',
      'Snapshot a log without losing history — and catch a straggler up with InstallSnapshot.',
    ],
    requires: 'requires T0 · partial failure & clocks',
    sideNote: '// lab 3 is where the paper stops being paper',
  },
  t2: {
    pitch:
      'The mechanism is built; now the contract. Consistency models are the spec your replication has to satisfy, and distributed transactions are what happens when atomicity itself has to survive a coordinator dying mid-sentence.',
    outcomes: [
      'Place any system on the spectrum: linearizable, sequential, causal, eventual — and say what clients can rely on.',
      'State CAP and PACELC as engineering trades, not slogans.',
      'Walk 2PC through its failure matrix and explain why modern systems replicate the transaction log instead.',
    ],
    requires: 'requires T1 · consensus & replication',
    sideNote: '// lab 6 grades exactly this: reads as proofs',
  },
  t3: {
    pitch:
      'The capstone of the mind: reading real systems. Five production anatomies, the Jepsen method, and three incident drills where the telemetry is all you get.',
    outcomes: [
      'See the one skeleton — quorum, log, state machine, snapshots — inside etcd, ZooKeeper, Kafka, Spanner, and TigerBeetle.',
      'Read a Jepsen analysis: history, nemesis, checker, counterexample.',
      'Diagnose split-brain, quorum loss, and flapping leaders from raw telemetry.',
    ],
    requires: 'requires T2 · consistency models',
    sideNote: '// the drills are the oral exam',
  },
}

/* ---------------------- sim metadata ---------------------- */

export interface SimInfo {
  id: SimId
  name: string
  hook: string
  icon: LucideIcon
  trackId: TrackId
}

export const SIM_INFO: Record<SimId, SimInfo> = {
  cluster: {
    id: 'cluster',
    name: 'The Cluster',
    hook: 'Five nodes, a lossy wire, and a partition knife.',
    icon: Network,
    trackId: 't0',
  },
}

/** Sims exercised by a given track's lessons (deduped, curriculum order). */
export function simsForTrack(trackId: string): { sim: SimInfo; lesson: Lesson }[] {
  const out: { sim: SimInfo; lesson: Lesson }[] = []
  const seen = new Set<SimId>()
  for (const l of lessonsForTrack(trackId)) {
    if (l.simId && !seen.has(l.simId)) {
      seen.add(l.simId)
      out.push({ sim: SIM_INFO[l.simId], lesson: l })
    }
  }
  return out
}

export type { Lesson, ContentBlock } from './types'
