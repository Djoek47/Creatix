'use client'

import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders model copy as structured prose (headings, emphasis, lists) instead of raw `**` / `##`.
 * Self-contained markdown subset — no react-markdown dependency.
 */
export type AiToolMarkdownVariant =
  | 'neutral'
  | 'circeRetention'
  | 'cupid'
  | 'competitor'
  | 'income'
  | 'mutedPanel'
  | 'caveat'

function linkClasses(v: AiToolMarkdownVariant): string {
  switch (v) {
    case 'circeRetention':
      return 'font-medium text-violet-200 underline decoration-violet-400/35 underline-offset-[0.2em] transition-colors hover:text-violet-100 hover:decoration-violet-300/55'
    case 'cupid':
      return 'font-medium text-amber-800 underline decoration-amber-500/35 underline-offset-[0.2em] transition-colors dark:text-amber-100/95 dark:decoration-amber-400/30 dark:hover:decoration-amber-300/50'
    case 'competitor':
      return 'font-medium text-foreground/90 underline decoration-foreground/20 underline-offset-[0.2em] transition-colors hover:decoration-foreground/40'
    case 'income':
      return 'font-medium text-circe underline decoration-circe/30 underline-offset-[0.2em] transition-colors hover:decoration-circe/50'
    case 'mutedPanel':
      return 'font-medium text-muted-foreground underline decoration-border underline-offset-[0.2em] transition-colors hover:text-foreground hover:decoration-foreground/25'
    case 'caveat':
      return 'font-medium text-amber-800 underline decoration-amber-500/40 underline-offset-[0.2em] transition-colors dark:text-amber-300/95 dark:decoration-amber-500/35 dark:hover:text-amber-100'
    default:
      return 'font-medium text-primary underline decoration-primary/35 underline-offset-[0.2em] transition-colors hover:decoration-primary/55'
  }
}

function quoteBorder(v: AiToolMarkdownVariant): string {
  switch (v) {
    case 'circeRetention':
      return 'border-violet-500/35'
    case 'cupid':
      return 'border-amber-500/35'
    case 'income':
      return 'border-circe/35'
    case 'caveat':
      return 'border-amber-500/30'
    default:
      return 'border-border/60'
  }
}

function strongClassFor(variant: AiToolMarkdownVariant): string {
  return variant === 'caveat'
    ? 'font-semibold text-amber-950 dark:text-amber-100'
    : 'font-semibold text-foreground'
}

const headingTone = (variant: AiToolMarkdownVariant) =>
  variant === 'caveat' ? 'text-amber-950 dark:text-amber-50' : 'text-foreground'

function parseInline(segment: string, variant: AiToolMarkdownVariant, keyPrefix: string): ReactNode[] {
  if (!segment) return []

  type Token =
    | { t: 't'; s: string }
    | { t: 'link'; label: string; href: string }
    | { t: '**'; body: string }
    | { t: '`'; body: string }
    | { t: '*'; body: string }

  const tokens: Token[] = []
  let rest = segment
  let guard = 0
  while (rest.length && guard++ < 50_000) {
    const code = /^`([^`]+)`/.exec(rest)
    if (code) {
      tokens.push({ t: '`', body: code[1] })
      rest = rest.slice(code[0].length)
      continue
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest)
    if (link) {
      tokens.push({ t: 'link', label: link[1], href: link[2] })
      rest = rest.slice(link[0].length)
      continue
    }
    const bold = /^\*\*((?:[^*]|\*(?!\*))+?)\*\*/.exec(rest)
    if (bold) {
      tokens.push({ t: '**', body: bold[1] })
      rest = rest.slice(bold[0].length)
      continue
    }
    const ital = /^\*((?:[^*])+?)\*(?!\*)/.exec(rest)
    const italUnd = /^_((?:[^_])+?)_(?!_)/.exec(rest)
    const m = ital && (!italUnd || ital.index <= italUnd.index) ? ital : italUnd
    if (m) {
      tokens.push({ t: '*', body: m[1] })
      rest = rest.slice(m[0].length)
      continue
    }

    let i = 0
    while (i < rest.length) {
      const s = rest.slice(i)
      if (/^`/.test(s)) break
      if (/^\[[^\]]*\]\(/.test(s)) break
      if (s.startsWith('**')) break
      if (/^\*([^*]|$)/.test(s) || /^_[^_]/.test(s)) break
      i++
    }
    tokens.push({ t: 't', s: rest.slice(0, Math.max(i, 1)) })
    rest = rest.slice(Math.max(i, 1))
  }

  let k = 0
  return tokens.flatMap((tok, idx): ReactNode[] => {
    const kk = `${keyPrefix}-${idx}-${k++}`
    if (tok.t === 't') return [<Fragment key={kk}>{tok.s}</Fragment>]
    if (tok.t === '`')
      return [
        <code
          key={kk}
          className="rounded-md bg-muted/65 px-[0.35em] py-[0.1em] font-mono text-[0.8125rem] text-foreground/95"
        >
          {tok.body}
        </code>,
      ]
    if (tok.t === 'link')
      return [
        <a
          key={kk}
          href={tok.href}
          className={linkClasses(variant)}
          target={tok.href.startsWith('http') ? '_blank' : undefined}
          rel={tok.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {parseInline(tok.label, variant, `${kk}a`)}
        </a>,
      ]
    if (tok.t === '**')
      return [
        <strong key={kk} className={strongClassFor(variant)}>
          {parseInline(tok.body, variant, `${kk}b`)}
        </strong>,
      ]
    return [
      <em key={kk} className="italic text-foreground/90">
        {parseInline(tok.body, variant, `${kk}i`)}
      </em>,
    ]
  })
}

function extractFenced(input: string): Array<{ md: boolean; lang?: string; body: string }> {
  const out: Array<{ md: boolean; lang?: string; body: string }> = []
  let i = 0
  while (i < input.length) {
    const fence = input.indexOf('```', i)
    if (fence === -1) {
      out.push({ md: true, body: input.slice(i) })
      break
    }
    if (fence > i) out.push({ md: true, body: input.slice(i, fence) })
    const afterFence = fence + 3
    const nl = input.indexOf('\n', afterFence)
    let lang = ''
    let bodyStart = afterFence
    if (nl !== -1 && nl - afterFence < 48) {
      lang = input.slice(afterFence, nl).trim()
      bodyStart = nl + 1
    }
    const close = input.indexOf('```', bodyStart)
    if (close === -1) {
      out.push({ md: true, body: input.slice(fence) })
      break
    }
    out.push({ md: false, lang: lang || undefined, body: input.slice(bodyStart, close).replace(/\n$/, '') })
    i = close + 3
  }
  return out
}

function isPipeTable(lines: string[]): boolean {
  if (lines.length < 3) return false
  const top = lines[0] ?? ''
  const sep = (lines[1] ?? '').trim()
  if (!/\|/.test(top)) return false
  return /-/g.test(sep) && /\|/.test(sep)
}

const olLine = /^(\d+)\.\s+(.*)$/
const ulBullet = /^(\s*)[-*]\s+(.*)$/u
const ulTask = /^\s*[-*]\s+\[([\sxX])\]\s+(.*)$/

export function AiToolMarkdownReadout({
  content,
  variant = 'neutral',
  className,
}: {
  content?: string | null
  variant?: AiToolMarkdownVariant
  className?: string
}) {
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) return null

  const qb = quoteBorder(variant)
  const hk = headingTone(variant)

  const nodes: ReactNode[] = []

  for (const seg of extractFenced(text)) {
    if (!seg.md) {
      nodes.push(
        <pre
          key={`f-${nodes.length}`}
          className="my-4 overflow-x-auto rounded-xl border border-border/40 bg-muted/25 p-4 font-mono text-[0.8125rem] leading-relaxed shadow-sm text-foreground/90"
        >
          <code>{seg.body}</code>
        </pre>
      )
      continue
    }

    const blocks = seg.body.split(/\n{2,}/)

    for (let bi = 0; bi < blocks.length; bi++) {
      const raw = blocks[bi]
      const lines = raw
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l) => {
          const t = l.trim()
          return t.length > 0 || l.includes('|')
        })
      if (!lines.length) continue

      const key = `${bi}-${nodes.length}`
      const h = /^(#{1,6})\s+(.*)$/.exec(lines[0].trimStart())
      if (h && lines.length === 1) {
        const level = Math.min(6, h[1].length)
        const inner = parseInline(h[2].trimEnd(), variant, `h-${key}`)
        let el: ReactNode
        if (level === 1) {
          el = (
            <h1 className={cn('mt-0 scroll-m-20 text-lg font-semibold tracking-tight first:mt-0', hk)}>
              {inner}
            </h1>
          )
        } else if (level === 2) {
          el = (
            <h2 className={cn('mt-9 scroll-m-20 text-[1.0625rem] font-semibold tracking-tight first:mt-0', hk)}>
              {inner}
            </h2>
          )
        } else if (level === 3) {
          el = (
            <h3
              className={cn(
                'mt-7 scroll-m-20 text-[0.96875rem] font-semibold tracking-tight first:mt-0',
                variant === 'caveat' ? hk : 'text-foreground/95'
              )}
            >
              {inner}
            </h3>
          )
        } else {
          el = (
            <h4 className="mt-6 text-[0.875rem] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
              {inner}
            </h4>
          )
        }

        nodes.push(<Fragment key={`bh-${key}`}>{el}</Fragment>)
        continue
      }

      if (/^(?:---+|\*{3,}|_{3,})$/.test(lines[0].trim()) && lines.length === 1) {
        nodes.push(<hr key={`hr-${key}`} className="my-8 border-0 border-t border-border/55" />)
        continue
      }

      if (lines.every((l) => l.trimStart().startsWith('>'))) {
        const body = lines.map((l) => l.replace(/^\s*>\s?/, '').trimEnd()).join('\n').trim()
        nodes.push(
          <blockquote
            key={`bq-${key}`}
            className={cn(
              'my-5 border-l-2 pl-4 text-[0.90625rem] leading-relaxed',
              variant === 'caveat' ? 'text-amber-900/90 dark:text-amber-200/88' : 'text-muted-foreground',
              qb
            )}
          >
            {parseInline(body, variant, `ibq-${key}`)}
          </blockquote>
        )
        continue
      }

      if (isPipeTable(lines)) {
        const headerCells = lines[0]
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((s) => s.trim())
          .filter((c) => c.length > 0)
        const bodyRows = lines.slice(2).map((row) =>
          row
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((s) => s.trim())
        )
        nodes.push(
          <div key={`tb-${key}`} className="my-5 overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full border-collapse text-[0.875rem]">
              <thead className="bg-muted/35">
                <tr>
                  {headerCells.map((hc, hi) => (
                    <th
                      key={`th-${hi}`}
                      className="px-3 py-2.5 text-left font-medium text-foreground/88 first:rounded-tl-xl last:rounded-tr-xl"
                    >
                      {parseInline(hc, variant, `th-${key}-${hi}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bodyRows.map((cells, ri) => (
                  <tr key={`tr-${ri}`}>
                    {cells.map((c, ci) => (
                      <td key={`td-${ci}`} className="px-3 py-2.5 align-top text-muted-foreground">
                        {parseInline(c, variant, `td-${key}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }

      const allOl = lines.length > 0 && lines.every((l) => olLine.test(l.trimStart()))

      const allUl =
        lines.length > 0 &&
        lines.every((l) => {
          const t = l.trimStart()
          return ulTask.test(t) || ulBullet.test(t)
        })

      if (allOl) {
        nodes.push(
          <ol
            key={`ol-${key}`}
            className="my-3 list-decimal space-y-2 pl-6 text-foreground/92 marker:font-medium marker:text-muted-foreground/80 first:mt-0"
          >
            {lines.map((l, ix) => {
              const m = olLine.exec(l.trimStart())
              if (!m) return null
              return (
                <li key={ix} className="leading-relaxed pl-1 [&>p]:my-0">
                  {parseInline(m[2], variant, `oli-${key}-${ix}`)}
                </li>
              )
            })}
          </ol>
        )
        continue
      }

      if (allUl) {
        nodes.push(
          <ul key={`ul-${key}`} className="my-3 list-none space-y-2 pl-0 first:mt-0">
            {lines.map((line, ix) => {
              const trimmed = line.trimStart()
              const task = ulTask.exec(trimmed)
              let txt: string
              if (task) {
                txt = task[2] ?? ''
              } else {
                const bm = ulBullet.exec(trimmed)
                txt = bm ? bm[2] ?? '' : line
              }
              const checked = task ? task[1].toLowerCase() === 'x' : false
              const nodeList = parseInline(txt.trim(), variant, `uli-${key}-${ix}`)
              return (
                <li key={ix} className="flex gap-3 leading-relaxed">
                  {task ? (
                    <input
                      type="checkbox"
                      disabled
                      readOnly
                      checked={checked}
                      className="mt-1 h-4 w-4 shrink-0 rounded border border-border"
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/45" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">{nodeList}</span>
                </li>
              )
            })}
          </ul>
        )
        continue
      }

      const para = raw.replace(/\n/g, ' ').trim()
      nodes.push(
        <p key={`p-${key}`} className="my-3 first:mt-0 last:mb-0 [&+&]:mt-3">
          {parseInline(para, variant, `pi-${key}`)}
        </p>
      )
    }
  }

  return (
    <div
      className={cn(
        'ai-tool-markdown max-w-none text-[0.9375rem] leading-[1.65] text-foreground/90',
        variant === 'caveat' && 'text-amber-950/95 dark:text-amber-100/90',
        className
      )}
    >
      {nodes}
    </div>
  )
}
