#!/usr/bin/env node
/**
 * Syncs lib/email/transactional-email-theme.ts CSS into Supabase Auth HTML templates.
 * Run: node scripts/patch-supabase-transactional-email-styles.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const themePath = join(root, 'lib', 'email', 'transactional-email-theme.ts')
const dir = join(root, 'docs', 'internal', 'supabase-email-templates')

const themeSrc = readFileSync(themePath, 'utf8')
const m = themeSrc.match(
  /export const TRANSACTIONAL_EMAIL_STYLE_BLOCK_INNER = `([\s\S]*?)`\.trim\(\)/,
)
if (!m) {
  console.error('Could not extract TRANSACTIONAL_EMAIL_STYLE_BLOCK_INNER from', themePath)
  process.exit(1)
}
const inner = m[1]
const newStyle = `<style type="text/css">\n${inner}\n</style>`

const singlePurpleBar =
  /<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="#5c4dbf" style="height:3px;line-height:0;background-color:#5c4dbf;"><\/td><\/tr><\/table>/g

const tripleBar = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:36%;height:3px;line-height:0;font-size:0;background-color:#5c4dbf;">&nbsp;</td>
<td style="width:28%;height:3px;line-height:0;font-size:0;background-color:#c9a84c;">&nbsp;</td>
<td style="width:36%;height:3px;line-height:0;font-size:0;background-color:#5c4dbf;">&nbsp;</td>
</tr></table>`

const names = readdirSync(dir).filter((n) => n.endsWith('.html'))
for (const name of names) {
  const p = join(dir, name)
  let s = readFileSync(p, 'utf8')
  if (!s.includes('<style type="text/css">')) continue
  s = s.replace(/<style type="text\/css">[\s\S]*?<\/style>/, newStyle)
  s = s.replace(/bgcolor="#f5f5f7" style="background-color:#f5f5f7;"/g, 'class="cev-email-outer cetv-sheet" bgcolor="#f3f1ec" style="background-color:#f3f1ec;"')
  s = s.replace(/background-color:#f5f5f7;/g, 'background-color:#f3f1ec;')
  s = s.replace(
    /bgcolor="#ffffff" style="background-color:#ffffff;border-radius:22px;border:1px solid #d8d8dd/g,
    'class="cev-email-card" bgcolor="#faf9f6" style="background-color:#faf9f6;border-radius:22px;border:1px solid #e8e4dc',
  )
  s = s.replace(singlePurpleBar, tripleBar)
  s = s.replace(/Circe et Venus · Creatix/g, 'Circe et Venus')
  writeFileSync(p, s)
  console.log('patched', name)
}
