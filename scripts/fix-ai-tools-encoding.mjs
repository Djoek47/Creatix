import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', 'messages')

function fixString(s) {
  return s
    .replace(/ÔÇö/g, '\u2014')
    .replace(/ÔÇÖ/g, '\u2019')
    .replace(/ÔÇ£/g, '\u201c')
    .replace(/ÔÇØ/g, '\u201d')
    .replace(/ÔåÆ/g, '\u2192')
}

function walk(v) {
  if (typeof v === 'string') return fixString(v)
  if (Array.isArray(v)) return v.map(walk)
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, val] of Object.entries(v)) {
      o[k] = walk(val)
    }
    return o
  }
  return v
}

for (const locale of ['en', 'es', 'fr', 'pt']) {
  const p = path.join(root, locale, 'ai-tools.json')
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  fs.writeFileSync(p, JSON.stringify(walk(data), null, 2), 'utf8')
  console.log('fixed', p)
}
