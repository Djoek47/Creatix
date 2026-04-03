import { NextResponse } from 'next/server'
import { logApiError } from '@/lib/usage/server-log'

/**
 * Log to api_error_logs and return a sanitized JSON error (no stack to client).
 */
export function adminJsonError(
  route: string,
  userId: string | null,
  status: number,
  publicMessage: string,
  err?: unknown,
  safeContext?: Record<string, unknown>,
): NextResponse {
  const stack = err instanceof Error ? err.stack ?? null : null
  logApiError({
    userId,
    route,
    httpStatus: status,
    message: err instanceof Error ? err.message : publicMessage,
    stack,
    safeContext,
  })
  return NextResponse.json({ error: publicMessage }, { status })
}
