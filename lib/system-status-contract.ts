/**
 * `@/app/api/system-status` payload — kept in `/lib` for client-safe type imports.
 */
export type PlatformStatusTone = 'up' | 'idle' | 'degraded'

export interface SystemStatusResponse {
  generatedAt: string
  hosting: {
    provider: 'vercel' | 'development'
    environment: string
    region: string | null
  }
  services: Array<{
    id: 'circe' | 'vercel-edge' | 'onlyfans-link' | 'fansly-link' | 'ai-models'
    label: string
    tone: PlatformStatusTone
    detail?: string
  }>
}
