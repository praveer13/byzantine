import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Pause, Play, RotateCcw, Scissors, Shuffle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The Cluster — byzantine's persistent world. Five nodes on one lossy
 * wire. Knobs: packet loss, delay, and a partition knife. Run elections,
 * split the brain, heal it, watch the term counter — T0/T1's lessons as a
 * living system instead of a diagram.
 */

const N = 5
const TICK_MS = 220

type Role = 'follower' | 'candidate' | 'leader'

interface NodeState {
  id: number
  role: Role
  term: number
  votedFor: number | null
  votes: number
  timeoutAt: number // tick when this follower loses patience
  alive: boolean
}

interface Msg {
  from: number
  to: number
  kind: 'request-vote' | 'vote' | 'heartbeat'
  term: number
  deliverAt: number
}

interface Log {
  t: number
  text: string
}

const COLORS: Record<Role, string> = {
  follower: '#6E6E80',
  candidate: '#5CA8FF',
  leader: '#3EF2A4',
}

function freshNodes(): NodeState[] {
  return Array.from({ length: N }, (_, id) => ({
    id,
    role: 'follower',
    term: 0,
    votedFor: null,
    votes: 0,
    timeoutAt: 12 + ((id * 7) % 14), // deterministic stagger
    alive: true,
  }))
}

export default function Cluster() {
  const [nodes, setNodes] = useState<NodeState[]>(freshNodes)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [log, setLog] = useState<Log[]>([])
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [lossPct, setLossPct] = useState(10)
  const [delayTicks, setDelayTicks] = useState(2)
  const [partition, setPartition] = useState<number[]>([]) // ids on the small side of the knife
  const rng = useRef(0xC147)

  const nextRand = () => {
    let x = rng.current
    x ^= x >> 12; x ^= x << 25; x ^= x >> 27
    x >>>= 0
    rng.current = x
    return (x * 0x2545f491) >>> 0
  }

  const say = useCallback((text: string) => {
    setLog((prev) => [...prev.slice(-30), { t: tick, text }])
  }, [tick])

  const send = (list: Msg[], from: number, to: number, kind: Msg['kind'], term: number) => {
    if (nextRand() % 100 < lossPct) return // lost on the wire
    list.push({ from, to, kind, term, deliverAt: tick + delayTicks })
  }

  const step = useCallback(() => {
    setTick((t) => t + 1)
    const t = tick + 1
    setNodes((prevNodes) => {
      const nodes = prevNodes.map((n) => ({ ...n }))
      const newMsgs: Msg[] = []

      // leaders heartbeat; followers lose patience
      for (const n of nodes) {
        if (!n.alive) continue
        if (n.role === 'leader') {
          for (const m of nodes) if (m.id !== n.id && m.alive) send(newMsgs, n.id, m.id, 'heartbeat', n.term)
        } else if (t >= n.timeoutAt) {
          // election!
          n.role = 'candidate'
          n.term += 1
          n.votedFor = n.id
          n.votes = 1
          n.timeoutAt = t + 12 + ((n.id * 5 + t) % 14)
          say(`n${n.id} times out → candidate for term ${n.term}`)
          for (const m of nodes) if (m.id !== n.id && m.alive) send(newMsgs, n.id, m.id, 'request-vote', n.term)
        }
      }

      // deliver messages
      setMsgs((prevMsgs) => {
        const arriving: Msg[] = []
        const inFlight: Msg[] = []
        for (const m of prevMsgs) {
          if (m.deliverAt <= t) arriving.push(m)
          else inFlight.push(m)
        }
        for (const m of arriving) {
          const target = nodes[m.to]
          const sender = nodes[m.from]
          if (!target?.alive || !sender?.alive) continue
          // partition knife: drop across the split
          const aSmall = partition.includes(m.from)
          const bSmall = partition.includes(m.to)
          if (partition.length > 0 && aSmall !== bSmall) continue

          if (m.kind === 'heartbeat') {
            if (m.term >= target.term) {
              if (target.role !== 'follower') say(`n${m.to} steps down (heartbeat from term ${m.term})`)
              target.role = 'follower'
              target.term = m.term
              target.votedFor = null
              target.timeoutAt = t + 12 + ((m.to * 7 + t) % 14)
            }
          } else if (m.kind === 'request-vote') {
            if (m.term > target.term || (m.term === target.term && (target.votedFor === null || target.votedFor === m.from))) {
              target.term = m.term
              target.role = 'follower'
              target.votedFor = m.from
              target.timeoutAt = t + 12 + ((m.to * 7 + t) % 14)
              const out: Msg[] = []
              send(out, m.to, m.from, 'vote', m.term)
              inFlight.push(...out)
            }
          } else if (m.kind === 'vote') {
            if (target.role === 'candidate' && m.term === target.term) {
              target.votes += 1
              if (target.votes > N / 2) {
                target.role = 'leader'
                say(`n${m.to} wins term ${target.term} with ${target.votes}/${N} votes`)
              }
            }
          }
        }
        return [...inFlight, ...newMsgs]
      })
      return nodes
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, lossPct, delayTicks, partition, say])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(step, TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, step])

  const reset = () => {
    setNodes(freshNodes())
    setMsgs([])
    setLog([])
    setTick(0)
    setPartition([])
  }

  const leader = nodes.find((n) => n.role === 'leader')

  return (
    <div className="mx-auto max-w-app px-6 pb-24 pt-16 lg:px-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">the cluster · sim</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-1 sm:text-4xl">Five nodes, one lossy wire</h1>
      <p className="mt-3 max-w-2xl text-body-lg text-text-2">
        Elections run live below. Turn the knobs: packet loss, wire delay, and the partition knife.
        The 2|3 split is the money demo — the minority side of the knife will refuse to elect anyone,
        and that refusal is the whole point of T1.
      </p>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px] text-text-3">
        <button onClick={() => setPlaying((p) => !p)} className="rounded-md border border-line bg-surface-1 p-2 text-text-2 hover:text-text-1" aria-label={playing ? 'pause' : 'play'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={reset} className="rounded-md border border-line bg-surface-1 p-2 text-text-2 hover:text-text-1" aria-label="reset">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const small = [0, 1]
            setPartition(partition.length ? [] : small)
            say(partition.length ? 'knife lifted — healed' : 'KNIFE: n0,n1 cut from n2,n3,n4')
          }}
          className={cn('inline-flex items-center gap-1.5 rounded-md border px-3 py-2 transition-colors', partition.length ? 'border-danger/60 bg-danger/10 text-danger' : 'border-line bg-surface-1 text-text-2 hover:text-text-1')}
        >
          <Scissors className="h-4 w-4" /> {partition.length ? 'heal the partition' : 'partition 2 | 3'}
        </button>
        <span className="ml-2">loss {lossPct}%</span>
        <input type="range" min={0} max={60} value={lossPct} onChange={(e) => setLossPct(Number(e.target.value))} className="w-24 accent-accent" />
        <span>delay {delayTicks} ticks</span>
        <input type="range" min={0} max={8} value={delayTicks} onChange={(e) => setDelayTicks(Number(e.target.value))} className="w-24 accent-accent" />
        <span className="ml-auto">tick {tick}</span>
      </div>

      {/* the wire */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-line bg-surface-1 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">
              the wire {partition.length > 0 && <span className="text-danger">· PARTITIONED [{partition.join(',')}]</span>}
            </p>
            <p className="font-mono text-[11px] text-text-3">
              {leader ? <span className="text-accent"><Crown className="mr-1 inline h-3 w-3" />n{leader.id} · term {leader.term}</span> : 'no leader'}
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            {nodes.map((n) => (
              <motion.div
                key={n.id}
                animate={{ scale: n.role === 'leader' ? 1.08 : 1 }}
                className={cn('flex-1 rounded-lg border p-3 text-center', partition.includes(n.id) && 'opacity-70')}
                style={{
                  borderColor: n.role === 'leader' ? COLORS.leader : n.role === 'candidate' ? COLORS.candidate : '#2E2E40',
                  backgroundColor: n.role === 'leader' ? 'rgba(62,242,164,0.08)' : '#14141d',
                }}
              >
                <p className="font-mono text-sm text-text-1">n{n.id}</p>
                <p className="mt-1 font-mono text-[10px]" style={{ color: COLORS[n.role] }}>{n.role}</p>
                <p className="mt-1 font-mono text-[10px] text-text-3">term {n.term}</p>
                <p className="font-mono text-[10px] text-text-3">{n.role === 'candidate' ? `votes ${n.votes}` : n.votedFor !== null ? `voted n${n.votedFor}` : '—'}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-text-3">
            <span className="flex items-center gap-1.5"><Shuffle className="h-3 w-3" /> in flight: {msgs.length}</span>
            <span className="flex items-center gap-1.5"><Wrench className="h-3 w-3" /> loss {lossPct}% · delay {delayTicks}t</span>
          </div>
        </div>

        {/* event log */}
        <div className="rounded-lg border border-line bg-ink p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">events</p>
          <div className="mt-2 space-y-1 font-mono text-[10.5px] leading-relaxed text-text-3">
            {log.length === 0 && <p className="text-text-3/60">— watching —</p>}
            {log.slice().reverse().map((l, i) => (
              <p key={i}><span className="text-text-3/60">{String(l.t).padStart(4, '0')}</span> {l.text}</p>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-body-sm text-text-3">
        Try: pause the knife on 2|3 with a leader on the majority side — the minority times out, runs
        elections, and wins nothing. That "nothing" is correctness. Then heal and watch the stale
        leader learn the new term and step down.
      </p>
    </div>
  )
}
