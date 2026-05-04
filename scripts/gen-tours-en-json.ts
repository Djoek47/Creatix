/**
 * Writes messages/en/tours.json from TOURS (excludes full-app-v3 → guideOrbit).
 * Run: npx tsx scripts/gen-tours-en-json.ts
 *
 * After changing `lib/tour-config.ts`, re-run this script, then refresh `messages/es|fr|pt/tours.json`
 * (merge or re-copy from en until those locales are fully translated).
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TOURS } from '../lib/tour-config'

const out: Record<string, Record<string, { title: string; description: string }>> = {}

for (const cfg of Object.values(TOURS)) {
  if (cfg.tourId === 'full-app-v3') continue
  if (!out[cfg.tourId]) out[cfg.tourId] = {}
  for (const s of cfg.steps) {
    out[cfg.tourId][s.id] = { title: s.title, description: s.description }
  }
}

const dest = join(process.cwd(), 'messages', 'en', 'tours.json')
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('Wrote', dest, 'tourIds:', Object.keys(out).sort().join(', '))
