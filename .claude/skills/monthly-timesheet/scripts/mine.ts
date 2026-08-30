/**
 * Extract the human-typed prompts from a Claude Code session .jsonl.
 * Usage: bun run mine.ts <file.jsonl> [regex] [maxLen]
 */
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

const [file, pat, maxLenRaw] = process.argv.slice(2)
if (!file) { console.error('usage: mine.ts <file.jsonl> [regex] [maxLen]'); process.exit(1) }
const re = pat ? new RegExp(pat, 'i') : null
const maxLen = Number(maxLenRaw) || 260

const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
const seen = new Set<string>()

for await (const line of rl) {
  let j: any
  try { j = JSON.parse(line) } catch { continue }

  let text = ''
  if (j.type === 'last-prompt') {
    text = typeof j.prompt === 'string' ? j.prompt : (j.prompt?.text ?? j.text ?? '')
  } else if (j.type === 'user' && j.message) {
    let c: any = j.message.content
    if (Array.isArray(c)) c = c.map((x: any) => (typeof x === 'string' ? x : x?.type === 'text' ? x.text : '')).join(' ')
    text = typeof c === 'string' ? c : ''
  }
  if (!text) continue

  text = text.replace(/\s+/g, ' ').trim()
  if (text.length < 20) continue
  if (/^(<system-reminder|Caveat:|<local-command|<command-name|\[Request interrupted)/.test(text)) continue
  if (re && !re.test(text)) continue

  const key = text.slice(0, 120)
  if (seen.has(key)) continue
  seen.add(key)

  const ts = (j.timestamp || '').slice(5, 16).replace('T', ' ')
  console.log(`[${ts}] ${text.slice(0, maxLen)}`)
}
