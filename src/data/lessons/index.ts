/**
 * Lesson registry — byzantine content source of truth.
 * Track ids: t0 (Failure & Time), t1 (Consensus).
 */

import type { LucideIcon } from 'lucide-react'
import { Network } from 'lucide-react'
import type { Lesson, SimId, TrackId } from './types'

// T0 — Failure & Time
import t0l1 from './t0/partial-failure'
import t0l2 from './t0/time-and-order'

// T1 — Consensus
import t1l1 from './t1/leader-election'

export const LESSONS_BY_TRACK: Record<TrackId, Lesson[]> = {
  t0: [t0l1, t0l2],
  t1: [t1l1],
}

export const TRACK_IDS: TrackId[] = ['t0', 't1']

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
      'Read Jepsen analyses without flinching: linearizability, split-brain, and the anomalies with names.',
    ],
    requires: 'requires T0 · partial failure & clocks',
    sideNote: '// lab 1 is where the paper stops being paper',
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
