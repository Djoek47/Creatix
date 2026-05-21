export const REGISTERED_DASHBOARD_ROUTES = new Set<string>([
  '/dashboard',
  '/dashboard/ai-studio',
  '/dashboard/analytics',
  '/dashboard/analytics/income-predictor',
  '/dashboard/brand-uniformity',
  '/dashboard/commenter',
  '/dashboard/community',
  '/dashboard/content',
  '/dashboard/content-library',
  '/dashboard/credits-planner',
  '/dashboard/divine-manager',
  '/dashboard/fans',
  '/dashboard/guide',
  '/dashboard/mentions',
  '/dashboard/messages',
  '/dashboard/protection',
  '/dashboard/retention',
  '/dashboard/retention/churn',
  '/dashboard/settings',
  '/dashboard/social',
  '/dashboard/well-being',
  '/dashboard/welcome',
])

const AI_STUDIO_TOOL_PATH = /^\/dashboard\/ai-studio\/tools\/[a-z0-9][a-z0-9-]{0,79}$/i
const SIMPLE_QUERY_VALUE = /^[a-z0-9_-]{1,64}$/i

export const RISKY_APP_ACTION_TOOLS = new Set<string>([
  'mass_dm',
  'send_message',
  'adjust_price',
  'pricing_changes',
  'content_publish',
  'publish_queue_item',
  'update_leak_alert_case',
])

export const SAFE_PARALLEL_APP_ACTION_TOOLS = new Set<string>([
  'get_stats',
  'list_fans',
  'list_followings',
  'get_fan_subscription_history',
  'get_top_message',
  'get_message_engagement',
  'get_dm_conversations',
  'lookup_fan',
  'get_dm_thread',
  'get_reply_suggestions',
  'get_dm_thread_and_suggestions',
  'get_fan_thread_insights',
  'list_content',
  'list_vault_for_dm',
  'get_content_sales_metadata',
  'get_scheduled_content_summary',
  'list_cosmic_calendar',
  'list_leak_alerts',
  'list_reputation_mentions',
  'list_reputation_briefings',
  'get_reputation_briefing',
  'list_recent_comment_analyses',
  'get_comment_reply_suggestions',
  'get_integrations_summary',
  'get_task_status',
  'get_recent_failures',
  'get_background_job',
  'ui_navigate',
  'ui_focus_fan',
  'notifications_panel',
  'analyze_image_from_url',
])

export function isRiskyAppActionTool(name: string | undefined | null): boolean {
  return typeof name === 'string' && RISKY_APP_ACTION_TOOLS.has(name)
}

export function isSafeParallelAppActionTool(name: string | undefined | null): boolean {
  return typeof name === 'string' && SAFE_PARALLEL_APP_ACTION_TOOLS.has(name)
}

function hasOnlyKeys(params: URLSearchParams, allowed: string[]): boolean {
  return [...params.keys()].every((key) => allowed.includes(key))
}

/** Allows only audited dashboard routes and tightly validated query params for voice/UI navigation. */
export function isAllowedUiNavigatePath(path: string): boolean {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/dashboard')) return false
  if (REGISTERED_DASHBOARD_ROUTES.has(trimmed)) return true

  const base = trimmed.split('?')[0]
  if (!REGISTERED_DASHBOARD_ROUTES.has(base)) {
    if (AI_STUDIO_TOOL_PATH.test(base)) return !trimmed.includes('?')
    return false
  }

  if (!trimmed.includes('?')) return true

  try {
    const params = new URLSearchParams(trimmed.slice(trimmed.indexOf('?')))
    const keys = [...params.keys()]

    if (base === '/dashboard/divine-manager') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'section') return false
      return SIMPLE_QUERY_VALUE.test(params.get('section') ?? '')
    }

    if (base === '/dashboard/ai-studio') {
      if (!hasOnlyKeys(params, ['tab', 'ai'])) return false
      const tab = params.get('tab')
      if (
        tab &&
        !['library', 'vault', 'tools', 'overview', 'circe', 'venus', 'cosmic', 'chatter'].includes(tab)
      ) {
        return false
      }
      const ai = params.get('ai')
      if (ai && !['circe', 'venus'].includes(ai)) return false
      return true
    }

    if (base === '/dashboard/messages') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'fanId') return false
      return SIMPLE_QUERY_VALUE.test(params.get('fanId') ?? '')
    }

    if (base === '/dashboard/settings') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'tab') return false
      return ['profile', 'notifications', 'security', 'billing', 'integrations', 'data', 'preferences'].includes(
        params.get('tab') ?? '',
      )
    }

    if (base === '/dashboard/retention') {
      if (keys.length === 0) return true
      if (keys.length !== 1 || keys[0] !== 'tab') return false
      return ['overview', 'churn', 'teases', 'fans'].includes(params.get('tab') ?? '')
    }

    return false
  } catch {
    return false
  }
}
