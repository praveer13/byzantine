import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't1.l2',
  slug: 'raft-replication',
  trackId: 't1',
  index: 2,
  title: 'The Log: Replication and Commit',
  minutes: 30,
  hook: 'A leader without a log is just a loud node. Replication is where consensus becomes a database — entries carrying terms, one commit rule everyone gets wrong, and the invariant your labs will grade.',
  exercise: 'quiz+sim',
  simId: 'cluster',
  blocks: [
    {
      type: 'prose',
      md: `T1.L1 got you a leader. A leader alone is nothing durable: it can take your writes, but the moment it dies, everything it knew dies with it. The election was never the point — the **log** the leader maintains is.

The model is the **replicated state machine**: if every node applies the *same commands in the same order* to a deterministic state machine, every node ends in the same state. So consensus reduces to agreeing on one ordered list of commands. The leader is just the serializer — it picks the order; the log is the product; your KV store is whatever replays it. Two nodes with identical logs are interchangeable, and that interchangeability *is* the fault tolerance.`,
    },
    {
      type: 'prose',
      md: `## AppendEntries: the only write path

Every client write becomes one log entry: **(index, term, command)**. The stamped term is the term of the leader that wrote it — load-bearing, not bookkeeping. It is how every later node tells "written this term" from "written three leaders ago," and the commit rule below depends on it.

The mechanics, one round:

1. **Local append.** The leader appends the entry to its own log. Uncommitted — it exists on exactly one disk.
2. **Replicate with a consistency check.** AppendEntries carries \`prev_log_index\` and \`prev_log_term\`: "my log ends here — does yours agree?" A follower whose entry at that index has a different term rejects, then **deletes the conflict and everything after it** and appends the leader's entries. The leader's log is the truth; followers converge by truncating their own divergence.
3. **Acks.** Followers confirm; the leader counts copies.

Real Raft tracks a \`next_index\` per follower and backtracks it on rejection until the logs agree. Lab 04 (raft-log) simplifies this to a full-log heartbeat with \`prev = (0, 0)\` — same convergence, fewer moving parts.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one replication round',
      height: 52,
      nodes: [
        { id: 'cli', x: 4, y: 6, w: 16, h: 9, label: 'client', sub: 'set x = 3', color: '#FBBF24' },
        { id: 'lead', x: 4, y: 26, w: 20, h: 10, label: 'leader', sub: 'term 4, log …6', color: '#3EF2A4' },
        { id: 'f1', x: 70, y: 6, w: 20, h: 9, label: 'follower', sub: 'log matches prev', color: '#5CA8FF' },
        { id: 'f2', x: 70, y: 22, w: 20, h: 9, label: 'follower', sub: 'log matches prev', color: '#5CA8FF' },
        { id: 'f3', x: 70, y: 38, w: 20, h: 9, label: 'follower', sub: 'conflict → truncate', color: '#A78BFA' },
      ],
      edges: [
        { from: 'cli', to: 'lead', label: 'propose' },
        { from: 'lead', to: 'f1', label: 'AppendEntries' },
        { from: 'lead', to: 'f2', label: 'AppendEntries' },
        { from: 'lead', to: 'f3', label: 'AppendEntries' },
      ],
      steps: [
        { caption: 'Client proposes; the leader appends (idx 7, term 4) locally. One disk, zero promises — uncommitted.', active: ['cli', 'lead'], edges: ['cli->lead'] },
        { caption: 'AppendEntries to all followers with prev_log = (6, term 4). The check is the whole protocol: disagree on prev, and you truncate your tail and take the leader\'s.', active: ['lead', 'f1', 'f2', 'f3'], edges: ['lead->f1', 'lead->f2', 'lead->f3'] },
        { caption: 'Followers verify prev, append, ack. f3 had a stale entry at idx 7 — it is deleted first. Divergence dies here, not at read time.', active: ['f1', 'f2', 'f3'] },
        { caption: 'Three copies (leader + 2) = majority → committed. The leader applies, replies to the client, and leader_commit rides the next heartbeat so followers apply too.', active: ['lead', 'f1', 'f2'], edges: ['lead->f1', 'lead->f2'] },
      ],
    },
    {
      type: 'prose',
      md: `## Commit: majority, plus the rule everyone gets wrong

An entry is **committed** when the leader knows it lives on a majority — only then does the client get its ack and the state machine may apply it. Now the subtle part (§5.4.2 of the paper, the paragraph that bit real systems): **a leader only advances commit_index by counting replicas of entries from its own current term.** Older-term entries become committed *indirectly* — as a prefix, once a current-term entry commits.

Why the rule exists — the classic counterexample. Leader A in term 2 writes an entry, replicates it to one follower, crashes. Term 3 elects B, which lacks that entry, writes its own at the same index, crashes. Term 4 re-elects A, which replicates its old term-2 entry to a third node — it now sits on a **majority**. If counting copies were enough, A would commit it. But A can crash again, and B's entry — from the *newer* term 3 — makes B's log look more up-to-date to voters. B wins term 5 and **overwrites that index on the majority**. The "committed" entry is gone. Counting replicas of old-term entries is not safety; it is a race you sometimes lose.

The fix holds because a committed current-term entry blocks any log missing it from winning an election (the completeness rule — next lesson). The older entries ride along as a committed prefix. Corollary you will see in real code: a fresh leader opens its term with a **no-op entry**, so there is something current-term to commit and the old tail can finally be declared safe.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The bug that ships in homegrown Raft',
      md: `Commit-by-counting applies to **current-term entries only**. The shortcut — "it's on 3 of 5 nodes, call it committed" — is precisely the §5.4.2 bug: an old-term entry on a majority can still be overwritten by a future leader carrying a newer-term log. Multiple production-grade implementations have shipped variants of this. When in doubt: commit your own term's entry and let the older ones inherit it.`,
    },
    {
      type: 'prose',
      md: `## From commit to apply

\`leader_commit\` rides on every AppendEntries, including empty ones — heartbeats are the commit announcement. Followers set their own commit index to \`min(leader_commit, last entry index)\`, then **apply** everything up to it. Apply happens only after commit, never before: applying an uncommitted entry would expose state that leader churn is entitled to erase.

Two invariants fall out, and they are what the labs grade:

- **The committed prefix is identical on all nodes.** If an entry is committed, every node that has it has the same command at the same index with the same term — and (next lesson) so will every future leader. Divergence in the committed prefix is a bug, full stop.
- **Log matching property.** If two logs contain an entry with the same index and term, they are identical in every entry before it. The prev-log check enforces this inductively: agree on entry N, and N-1 was already agreed, all the way down.

Lab 04 hands you this skeleton: implement \`propose\`, \`heartbeat\`, and commit-advance, and the grader checks exactly these two invariants under churn.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'Why does every log entry carry the term in which it was written?',
          options: [
            'For metrics and debugging dashboards',
            'It makes old-term entries identifiable — the leader can tell current-term entries (safe to commit by counting) from older-term ones (not safe), and voters can compare log freshness',
            'To order entries within a term — indices alone cannot do that',
            'Because followers reject entries without one — the term is the payload checksum',
          ],
          correct: [1],
          explanation:
            'The entry term is what makes "written three leaders ago" visible at a glance. Both the §5.4.2 commit rule and the election freshness comparison (last-term, then last-index) read it.',
        },
        {
          q: 'An entry from term 2 is stored on a majority (3 of 5). The current leader, elected for term 4, may…',
          options: [
            'Commit it immediately — a majority of copies is the definition of committed',
            'Never commit it, since it belongs to a dead leader',
            'Not commit it by counting — only a term-4 entry advances commit_index; the term-2 entry commits indirectly as a prefix once a term-4 entry commits',
            'Overwrite it immediately, since the old leader is gone',
          ],
          correct: [2],
          explanation:
            'An old-term entry on a majority can still be overwritten by a future leader with a newer-term log (§5.4.2). It becomes durable only when a current-term entry lands on a majority — then the whole prefix is committed.',
        },
        {
          q: 'The log matching property says…',
          options: [
            'All nodes\' logs are identical at all times',
            'If two logs contain an entry with the same index and term, they are identical in every preceding entry — enforced inductively by the prev-log consistency check',
            'Matching logs imply matching state machines, even before apply',
            'Two entries with the same term always carry the same command',
          ],
          correct: [1],
          explanation:
            'AppendEntries only succeeds when prev_log_index/prev_log_term match, so appending at index N proves agreement at N-1, which proved N-2 — induction down to entry 1. Uncommitted tails may still differ; the checked prefix cannot.',
        },
        {
          q: 'A follower receives AppendEntries with leader_commit beyond its own commit index. It should…',
          options: [
            'Apply entries up to leader_commit immediately, even past the end of its log',
            'Set commit index to min(leader_commit, index of its last entry), then apply everything up to it',
            'Ignore it — commit information is only valid in the next term',
            'Commit the entries but wait for its own client ack before applying',
          ],
          correct: [1],
          explanation:
            'The min() matters: leader_commit cannot exceed what the follower actually holds. Apply strictly follows commit — exposing uncommitted state would let leader churn erase something a client already observed.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Now go replicate it',
      md: `Open The Cluster (/cluster): propose writes, then kill the leader mid-replication and watch entry terms decide what survives the next election. Then write lab 04 (raft-log): propose, heartbeat, commit-advance — the lab's full-log heartbeat is the deliberate simplification of per-follower \`next_index\` backtracking, and the convergence invariant you must preserve is identical. Reading: the Raft paper (Ongaro & Ousterhout, 2014), §5.3 (log replication) and §5.4 (safety) — this lesson is those pages with the politeness removed.`,
    },
  ],
}

export default lesson
