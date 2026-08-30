/**
 * Per-day activity window from Claude Code session transcripts.
 * Usage: bun run activity.ts <projectDir> [labelPrefix]
 * Emits: date, first/last timestamp, record count — i.e. when work actually happened.
 */
import { createReadStream, readdirSync, statSync } from 'fs'
import { createInterface } from 'readline'
import { join } from 'path'

const dir = process.argv[2]
const label = process.argv[3] ?? ''
const days = new Map<string, { n: number; first: string; last: string }>()

for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  const p = join(dir, f)
  if (statSync(p).size < 5000) continue
  const rl = createInterface({ input: createReadStream(p), crlfDelay: Infinity })
  for await (const line of rl) {
    // cheap timestamp scrape — avoids parsing every huge record
    const m = line.match(/"timestamp":"(2026-08-\d{2})T(\d{2}:\d{2})/)
    if (!m) continue
    const [, d, t] = m
    const e = days.get(d)
    if (!e) days.set(d, { n: 1, first: t, last: t })
    else { e.n++; if (t < e.first) e.first = t; if (t > e.last) e.last = t }
  }
}

const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
for (const [d, v] of [...days].sort()) {
  const dow = DOW[new Date(`${d}T00:00:00Z`).getUTCDay()]
  console.log(`  ${label}${d} ${dow}  ${v.first}-${v.last}  records=${v.n}`)
}
