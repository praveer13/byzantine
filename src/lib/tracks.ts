/**
 * Shared curriculum metadata — byzantine (distributed systems correctness).
 * Same TrackMeta/SimMeta contract the platform components consume.
 */

import type { LucideIcon } from 'lucide-react'
import { Database, Network, ScanSearch, ShieldCheck, Timer, Vote } from 'lucide-react'

export interface TrackMeta {
  code: string
  id: string
  name: string
  color: string
  glyph: LucideIcon
  promise: string
  lessons: number
  exercises: number
  hours: number
}

export const TRACKS: TrackMeta[] = [
  {
    code: 'T0',
    id: 't0',
    name: 'Failure & Time',
    color: '#22D3EE',
    glyph: Timer,
    promise: 'The network lies, clocks drift, and "the other machine" is always a rumor.',
    lessons: 4,
    exercises: 4,
    hours: 2,
  },
  {
    code: 'T1',
    id: 't1',
    name: 'Consensus',
    color: '#A78BFA',
    glyph: Vote,
    promise: 'Getting unreliable machines to agree — elections, logs, and the quorum.',
    lessons: 3,
    exercises: 3,
    hours: 2,
  },
  {
    code: 'T2',
    id: 't2',
    name: 'Consistency & Transactions',
    color: '#3EF2A4',
    glyph: Database,
    promise: '"Consistent" is a contract, not a vibe — and atomicity across machines is a promise made by a coordinator that can die mid-sentence.',
    lessons: 2,
    exercises: 2,
    hours: 1,
  },
  {
    code: 'T3',
    id: 't3',
    name: 'Production Anatomy',
    color: '#5CA8FF',
    glyph: ScanSearch,
    promise: 'Reading real systems — etcd to TigerBeetle, Jepsen reports, and the telemetry of a dying cluster.',
    lessons: 3,
    exercises: 3,
    hours: 2,
  },
]

export const CAPSTONE: TrackMeta = {
  code: 'T*',
  id: 'capstone',
  name: 'Capstone: Build a Linearizable KV',
  color: '#FBBF24',
  glyph: ShieldCheck,
  promise: 'A replicated, linearizable key-value store over your own Raft — graded under partitions.',
  lessons: 0,
  exercises: 0,
  hours: 0,
}

export const TOTAL_TRACK_LESSONS = TRACKS.reduce((n, t) => n + t.lessons, 0)

export function getTrack(id: string): TrackMeta | undefined {
  return TRACKS.find((t) => t.id === id)
}

export interface SimMeta {
  id: string
  name: string
  hook: string
  icon: LucideIcon
  trackId: string
  usedIn: string
  difficulty: 1 | 2 | 3
}

/** Simulators, in showcase order. */
export const SIMS: SimMeta[] = [
  {
    id: 'cluster',
    name: 'The Cluster',
    hook: 'Five nodes, a lossy wire, and a partition knife.',
    icon: Network,
    trackId: 't0',
    usedIn: 'T0.L1',
    difficulty: 2,
  },
]

/** Ordered lesson ids across tracks for next-lesson selectors. */
export const ORDERED_LESSON_IDS: string[] = TRACKS.flatMap((t) =>
  Array.from({ length: t.lessons }, (_, i) => `${t.id}.l${i + 1}`),
)
