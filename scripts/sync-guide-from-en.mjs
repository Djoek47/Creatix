/**
 * Copies `platformStatusLabels` and `guide` from messages/en/dashboard.json
 * into es/fr/pt so Guide + header platform labels resolve in every locale.
 * Re-run after editing the English guide block.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const enPath = path.join(root, 'messages', 'en', 'dashboard.json')
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const block = {
  platformStatusLabels: en.platformStatusLabels,
  guide: en.guide,
}

for (const locale of ['es', 'fr', 'pt']) {
  const p = path.join(root, 'messages', locale, 'dashboard.json')
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  Object.assign(data, block)
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

console.log('Synced platformStatusLabels + guide to es, fr, pt from en.')
