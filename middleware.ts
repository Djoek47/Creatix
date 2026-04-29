import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  /** Stripe must verify HMAC against the exact raw body — skip Supabase session/auth here. */
  if (request.nextUrl.pathname.startsWith('/api/stripe/webhook')) {
    return NextResponse.next()
  }

  try {
    return await updateSession(request)
  } catch (err) {
    console.error('[middleware]', err)
    return new NextResponse('Middleware error', { status: 500 })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - GET /api/content/vault/[id]/asset — token-auth proxy for Frame; skips Edge
     *   Supabase session refresh (avoids MIDDLEWARE_INVOCATION_FAILED when Edge
     *   session refresh fails; the route handler verifies ?t= itself).
     */
    '/((?!_next/static|_next/image|favicon.ico|api/content/vault/[^/]+/asset$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
