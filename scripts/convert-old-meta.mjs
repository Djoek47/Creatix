import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const utf8Path = path.join(__dirname, 'old-ai-tools-data.utf8.txt')
const legacyPath = path.join(__dirname, 'old-ai-tools-data.ts.txt')
let src = fs.existsSync(utf8Path)
  ? fs.readFileSync(utf8Path, 'utf8')
  : fs.readFileSync(legacyPath, 'utf16le')
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)
const startMark = 'export const ALL_TOOLS_META: AIToolMeta[] = ['
const start = src.indexOf(startMark)
if (start === -1) throw new Error('start mark not found')
const tail = src.slice(start + startMark.length - 1)
const endm = /\]\r?\n\r?\nexport const TOOL_IDS_WITH_RUNNER/.exec(tail)
if (!endm) throw new Error('could not find end of ALL_TOOLS_META array')
const arrText = tail.slice(0, endm.index + 1)

/** @type {unknown} */
const arr = new Function(`return ${arrText}`)()
if (!Array.isArray(arr)) throw new Error('Parsed meta is not an array')

const tools = {}
for (const row of arr) {
  if (!row || typeof row !== 'object') continue
  const r = row
  const id = r.id
  if (typeof id !== 'string') continue
  tools[id] = {
    name: typeof r.name === 'string' ? r.name : id,
    description: typeof r.description === 'string' ? r.description : '',
    longDescription: typeof r.longDescription === 'string' ? r.longDescription : '',
    ...(typeof r.badge === 'string' ? { badge: r.badge } : {}),
  }
}

const extra = {
  'brand-uniformity': {
    name: 'Brand Uniformity',
    description: 'Branding consistency tools',
    longDescription: 'Open the Brand Uniformity workspace from your dashboard when it is available.',
  },
  'mass-dm-composer': {
    name: 'Mass DM Composer',
    description: 'Campaign copy for mass DMs',
    longDescription: 'Compose mass DM campaigns with AI assistance from the AI Studio runner.',
  },
  'venus-attraction': {
    name: 'Venus attraction',
    description: 'Legacy route',
    longDescription: 'This tool route is no longer available from AI Studio.',
  },
}

Object.assign(tools, extra)

const outPath = path.join(__dirname, 'tools-en.json')
fs.writeFileSync(outPath, JSON.stringify(tools, null, 2), 'utf8')
console.log('Wrote', outPath, Object.keys(tools).length, 'tools')
