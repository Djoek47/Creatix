import createIntlMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { routing } from '@/lib/i18n/routing'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { isBareMarketingPath } from '@/lib/i18n/marketing-paths'
import { readGeoFromHeaders } from '@/lib/i18n/locale-from-geo'
import { negotiatePublicLocale } from '@/lib/i18n/resolve-locale'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware(routing)

function applyCookiesFrom(source: NextResponse, onto: NextResponse): void {
  source.cookies.getAll().forEach((c) => {
    onto.cookies.set(c.name, c.value, {
      expires: c.expires,
      maxAge: typeof c.maxAge === 'number' ? c.maxAge : undefined,
      domain: c.domain ?? undefined,
      path: c.path ?? '/',
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite:
        typeof c.sameSite === 'boolean'
          ? c.sameSite === true
            ? ('strict' as const)
            : undefined
          : ((c.sameSite as 'strict' | 'lax' | 'none' | undefined) ?? undefined),
    })
  })
}

export function bypassLocaleRouting(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/mobile') ||
    pathname.startsWith('/protected') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/cookies') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/about')
  )
}

/** Marketing routes rewritten as `/en/…`; legal stays unprefixed. */
function pathnameHasMarketingLocaleSegment(pathname: string): boolean {
  return /^\/(en|es|pt|fr)(\/|$)/.test(pathname)
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/stripe/webhook')) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith('/api/openai/webhook')) {
    return NextResponse.next()
  }

  try {
    const sessionResponse = await updateSession(request)
    const pathname = request.nextUrl.pathname

    if (sessionResponse.status !== 200) {
      return sessionResponse
    }

    if (sessionResponse.headers.has('location')) {
      return sessionResponse
    }

    if (bypassLocaleRouting(pathname)) {
      return sessionResponse
    }

    if (pathnameHasMarketingLocaleSegment(pathname)) {
      const intlResponse = intlMiddleware(request)
      applyCookiesFrom(sessionResponse, intlResponse)
      return intlResponse
    }

    if (isBareMarketingPath(pathname)) {
      const geo = readGeoFromHeaders(request.headers)
      const locale = negotiatePublicLocale(
        sessionResponse.cookies.get(LOCALE_COOKIE)?.value ??
          request.cookies.get(LOCALE_COOKIE)?.value ??
          null,
        request.headers.get('accept-language'),
        geo,
      )
      const url = request.nextUrl.clone()
      url.pathname =
        pathname === '/' || pathname === '' ? `/${locale}` : `/${locale}${pathname}`
      const redirectResponse = NextResponse.redirect(url)
      applyCookiesFrom(sessionResponse, redirectResponse)
      return redirectResponse
    }

    return sessionResponse
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
