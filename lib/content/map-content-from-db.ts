import type { Content, ContentStatus, PerformanceMetrics, Platform } from '@/lib/types'

const PLATFORM_SET = new Set<Platform>(['onlyfans', 'fansly', 'manyvids', 'mym', 'loyalfans'])

function num(v: unknown, fallback = 0): number {
  if (v == null) return fallback
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = Number(v)
  return Number.isNaN(n) ? fallback : n
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function buildMediaUrls(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.media_urls) && row.media_urls.length) {
    return (row.media_urls as unknown[]).filter((u): u is string => typeof u === 'string' && u.length > 0)
  }
  const urls: string[] = []
  for (const key of ['file_url', 'thumbnail_url', 'external_preview_url'] as const) {
    const v = row[key]
    if (typeof v === 'string' && v.length > 0) urls.push(v)
  }
  const contentType = row.content_type
  if (contentType === 'video' && !urls.some((u) => u.toLowerCase().includes('video'))) {
    urls.push('video/*')
  }
  return urls
}

function buildPerformanceMetrics(row: Record<string, unknown>): PerformanceMetrics {
  const raw = row.performance_metrics
  if (isRecord(raw) && (raw.views != null || raw.likes != null)) {
    return {
      views: num(raw.views, 0),
      likes: num(raw.likes, 0),
      comments: num(raw.comments, 0),
      shares: num(raw.shares, 0),
      revenue: num(raw.revenue, 0),
    }
  }
  return {
    views: num(row.views_count, 0),
    likes: num(row.likes_count, 0),
    comments: num(row.comments_count, 0),
    shares: num(row.shares_count, 0),
    revenue: num(row.revenue, 0),
  }
}

function parsePlatforms(row: Record<string, unknown>): Platform[] {
  const raw = row.platforms
  if (!Array.isArray(raw)) return []
  const out: Platform[] = []
  for (const p of raw) {
    if (typeof p === 'string' && PLATFORM_SET.has(p as Platform)) out.push(p as Platform)
  }
  return out
}

function asContentStatus(s: unknown): ContentStatus {
  if (s === 'draft' || s === 'scheduled' || s === 'published' || s === 'archived') return s
  return 'draft'
}

/**
 * Maps a Supabase `content` row to the `Content` shape used by the dashboard UI.
 * The DB uses flat columns (`views_count`, `file_url`); the UI expects
 * `performance_metrics` and `media_urls`.
 */
export function mapContentFromDbRow(row: Record<string, unknown>): Content {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: typeof row.title === 'string' ? row.title : '',
    description: row.description == null || typeof row.description === 'string' ? (row.description as string | null) : null,
    media_urls: buildMediaUrls(row),
    platforms: parsePlatforms(row),
    status: asContentStatus(row.status),
    scheduled_at: row.scheduled_at == null ? null : String(row.scheduled_at),
    published_at: row.published_at == null ? null : String(row.published_at),
    performance_metrics: buildPerformanceMetrics(row),
    tags: Array.isArray(row.tags) ? (row.tags as string[]).filter((t) => typeof t === 'string') : [],
    created_at: row.created_at == null ? new Date().toISOString() : String(row.created_at),
    updated_at: row.updated_at == null ? new Date().toISOString() : String(row.updated_at),
  }
}

export function mapContentFromDbRows(rows: unknown[] | null | undefined): Content[] {
  if (!rows?.length) return []
  return rows
    .filter((r): r is Record<string, unknown> => isRecord(r))
    .map((r) => mapContentFromDbRow(r))
}
