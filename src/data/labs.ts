/**
 * Forge labs — local-only Rust labs, graded in-browser (same zero-dep
 * wasm ABI as the rest of the platform: ks_alloc/ks_free/ks_run).
 */

import type { TrackId } from '@/data/lessons/types'

export interface ForgeLabCheck {
  id: string
  label: string
}

export interface ForgeLab {
  id: string
  index: number
  title: string
  hook: string
  trackId: TrackId
  lessonId: string
  minutes: number
  zip: string
  artifact: string
  editFile: string
  completion: { title: string; next: string }
  checks: ForgeLabCheck[]
  brief: string[]
}

export const FORGE_LABS: ForgeLab[] = [
  {
    id: 'echo-node',
    index: 1,
    title: 'Exactly Once, At Least Once',
    hook: 'Your first node: an echo handler over a network that loses and duplicates messages. Dedup table, response cache, and the discipline that makes retries safe — graded by 2000 hostile deliveries.',
    trackId: 't0',
    lessonId: 't0.l1',
    minutes: 60,
    zip: '/labs/echo-node.zip',
    artifact: 'target/wasm32-unknown-unknown/release/echo_node.wasm',
    editFile: 'src/node.rs',
    completion: {
      title: 'all five green — your node survives a lying network.',
      next: 'next: T1 puts five of these on The Cluster and makes them elect a leader. Your dedup table just became a state machine.',
    },
    checks: [
      { id: 'echo_basic', label: 'echo: reply mirrors payload and seq' },
      { id: 'dup_effect_once', label: 'duplicates: effect applied once, answered every time' },
      { id: 'monotonic_seq', label: 'replayed seq gets the ORIGINAL answer' },
      { id: 'multi_sender', label: 'dedup is per (sender, seq), not global' },
      { id: 'storm', label: '2000 hostile deliveries: every unique message processed exactly once' },
    ],
    brief: [
      'At-least-once delivery is the only kind a real network can offer — which means duplicates are not an edge case, they are the air your node breathes. The discipline: process each unique message EXACTLY once (the effect), while answering every delivery (the response). Retry-safe by construction, not by luck.',
      'The structure is a dedup table keyed by (sender, seq) that stores the REPLY, not just a seen-flag — a replayed message gets the original answer back, not a shrug. This is the idempotent-receiver pattern, and it is the seed of every replicated state machine you will build in T1.',
      'The harness is the teacher: five checks from a polite echo to a 2000-delivery storm with ~30% loss and duplication across 8 senders. If your counting is off by one duplicate anywhere, the storm finds it.',
    ],
  },
]

export function forgeLabById(id: string | undefined): ForgeLab | undefined {
  return FORGE_LABS.find((l) => l.id === id)
}
