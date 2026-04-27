#!/usr/bin/env node
/**
 * Fails if the misspelling "Creatrix" appears under user-facing source trees.
 * Run: node scripts/check-forbidden-branding.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BAD = /creatrix/i
const ROOTS = ['app', 'components', 'lib', 'apps/mobile/app', 'public']
const EXT = /\.(tsx|ts|jsx|js|mdx|md|html|json)$/i
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__'])

function walk(dir, acc = []) {
  let st
  try {
    st = statSync(dir)
  } catch {
    return acc
  }
  if (!st.isDirectory()) return acc
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue
    const p = join(dir, name)
    let s
    try {
      s = statSync(p)
    } catch {
      continue
    }
    if (s.isDirectory()) walk(p, acc)
    else if (EXT.test(p)) acc.push(p)
  }
  return acc
}

const hits = []
for (const root of ROOTS) {
  for (const file of walk(join(process.cwd(), root))) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    if (BAD.test(text)) hits.push(file)
  }
}

if (hits.length) {
  console.error('Forbidden branding "Creatrix" found in:\n' + hits.join('\n'))
  process.exit(1)
}
console.log('check-forbidden-branding: ok')
