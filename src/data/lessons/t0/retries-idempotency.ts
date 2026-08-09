import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 't0.l4',
  slug: 'retries-idempotency',
  trackId: 't0',
  index: 4,
  title: 'Retries, Idempotency, and At-Least-Once',
  minutes: 25,
  hook: 'When the network eats your response, you have exactly one recovery move: try again. Every retry turns one operation into a maybe-twice — this lesson is about making twice harmless.',
  exercise: 'quiz',
  blocks: [
    {
      type: 'prose',
      md: `Back to T0.L1's crime scene: the request went out, the response never came home, and the work *may have happened anyway*. What are your options? Wait forever (no). Ask the server what it did (that's another request, with the same problem). You have exactly one move: **retry**.

And the moment you retry, you have accepted the network's only guarantee: **at-least-once**. Your operation may execute zero times, once, or five times, and no transport can do better — exactly-once *delivery* is the two-generals problem, unsolvable in principle. What *does* exist is exactly-once **effect**: an operation designed so that the second execution changes nothing. That is not a feature of the wire; it is a property you build into the API. You have already built it once — lab 01 (echo-node) had you keep a dedup table and a response cache so a retried request got its original answer back. This lesson is the theory of what your hands already did.`,
    },
    {
      type: 'prose',
      md: `## Idempotency keys: the pattern

The construction that makes retries safe, end to end:

1. The **client** generates a unique key per *logical operation* — a UUID minted once, then attached to **every retry** of that operation. (Per-attempt IDs are the classic bug: they dedup nothing.)
2. The **server** keeps a table: key → stored response. First arrival: execute, persist the result *with the key*, reply.
3. A retry arrives with a known key: **replay the stored response** — the original answer, byte for byte. Not a re-execution. The charge is not re-run; the increment is not re-applied; the row is not re-inserted.

This is exactly lab 01's response cache, and notice what it buys: the client can no longer distinguish "executed once" from "executed once, answered twice" — and it no longer needs to. The fine print is real but small: keys need a scope (per account, per endpoint) and a TTL, because the dedup table cannot grow forever — the retry window bounds how long a duplicate can plausibly arrive.`,
    },
    {
      type: 'prose',
      md: `## Retry policy, or how to not DDoS yourself

An immediate retry on failure is a client that hammers a struggling service at exactly the moment it can least afford it. The standard shape has four parts:

- **Exponential backoff:** wait 100 ms, then 200, then 400 — each attempt costs the service less frequency while it recovers.
- **Jitter:** randomize the wait within its window. This is load-bearing: a failure event hits *all* your clients at once, and identical backoff schedules make them retry in lockstep — a synchronized hammer blow on a service that just staggered upright. The thundering herd is a symmetry problem, and randomness is the symmetry-breaker. You have seen this trick before: randomized election timeouts exist for exactly the same reason.
- **Retry budget:** cap the share of traffic that may be retries (say 10–20%). Without it, a real outage turns your retry layer into a load multiplier with no ceiling.
- **Deadline:** one end-to-end budget for the whole operation. When it expires, stop — even with attempts left. "3 retries" against a 30-second deadline is a policy; "3 retries" against forever is a hang.

And retry only the retryable: timeouts and 503s, mostly. A 400 will still be a 400 the fifth time.`,
    },
    {
      type: 'prose',
      md: `## What's safe to retry

Sort your operations into three buckets:

- **Naturally idempotent** — retry freely: reads; \`put x = 5\` (do it twice, same state); delete-if-exists.
- **Made idempotent** — retry with a key: the canonical case is a payment. Stripe's API takes an \`Idempotency-Key\` header on \`POST /charges\`; a network retry replays the original charge's response instead of creating a second one. Money moves exactly once because the API was designed for the retry, not because the network was careful.
- **Never safe without help** — \`increment\`, \`append\`, \`transfer\`: anything whose result depends on current state. Retrying \`balance += 100\` after an ambiguous timeout is how you pay someone twice. The fix is to *make* it idempotent: send \`set balance = 500\`, or a conditional update — "apply this if the version is still 7."

The deepest version of this idea is **versioned mutations**: every mutation attempt bumps the version, *even the ones that change nothing*. That is precisely lab 02 (kv-store)'s delete-version rule: a delete of an absent key still records the attempt. Why? So a retried delete can be told apart from a first delete, and "key never existed" from "key deleted twice" — otherwise a duplicate delete resurrects ambiguity about the key's whole history. Lab 02 is where you practice this until it becomes reflex.`,
    },
    {
      type: 'callout',
      variant: 'analogy',
      md: `An idempotency key is an **upsert with a client-supplied primary key**. \`INSERT ... ON CONFLICT (request_id) DO NOTHING\` — you have been writing idempotent mutations in SQL for years. The distributed version is the same trick with a nastier failure mode: the "conflict" is a network retry arriving late, and the table is a dedup cache with an eviction policy instead of a B-tree.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'What delivery guarantee can a network actually offer a retrying client?',
          options: [
            'Exactly-once, if TCP is used',
            'At-most-once',
            'At-least-once — exactly-once *delivery* is impossible; exactly-once *effect* is a design property of the API, not the transport',
            'Exactly-once, if the payload has a checksum',
          ],
          correct: [2],
          explanation:
            'Retrying converts "maybe zero times" into "maybe many times" — those are the only two settings the network offers. Exactly-once effects come from idempotency machinery (keys, dedup, conditional writes), never from the wire.',
        },
        {
          q: 'A request arrives with an idempotency key the server has already processed. The server should…',
          options: [
            'Re-execute the operation and return the fresh result',
            'Return the stored original response without re-executing — the retry wants the same answer, not a second execution',
            'Reject it as a duplicate error',
            'Queue it until the first request finishes',
          ],
          correct: [1],
          explanation:
            'The response cache is the whole point: replaying the original answer makes "executed once, answered twice" indistinguishable from "executed once" — which is what lets the client retry fearlessly. Re-executing is the bug the key exists to prevent.',
        },
        {
          q: 'Jitter in exponential backoff exists primarily to…',
          options: [
            'Reduce average latency',
            'Spread load evenly across servers',
            'Break the synchronization of many clients retrying after a correlated failure — without it, fixed backoff schedules make the herd retry in lockstep and re-crush the recovering service',
            'Comply with TCP retransmission rules',
          ],
          correct: [2],
          explanation:
            'A failure event is correlated: every client sees it at once. Identical backoff math produces identical retry instants — the thundering herd. Randomness is the symmetry-breaker, exactly as with randomized election timeouts.',
        },
        {
          q: 'Which operation is safe to retry exactly as written, with no key and no condition?',
          options: [
            'balance += 100',
            'append(item) to a list',
            'charge(card, $50)',
            'put x = 5 — writing the same value twice leaves the same state, so the duplicate is harmless',
          ],
          correct: [3],
          explanation:
            'Overwriting with a fixed value is naturally idempotent; reads and delete-if-exists are too. Increments, appends, and charges depend on current state or create new records — they need idempotency keys or versioned conditions before a retry is safe.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Make it sting twice',
      md: `Two assignments. First: re-run lab 01's storm check — crank the loss, let the retries fly, and watch your dedup table absorb duplicates while the response cache replays original answers. Second: read [Stripe's idempotency documentation](https://docs.stripe.com/api/idempotent_requests) — it is your lab 01 pattern at payments scale, down to the 24-hour key TTL. Notice what that TTL admits: the dedup table is a cache, it obeys cache physics, and somebody sized it to the longest plausible retry window. Then look at one mutating endpoint in a system you own and ask which of the three buckets it falls in.`,
    },
  ],
}

export default lesson
