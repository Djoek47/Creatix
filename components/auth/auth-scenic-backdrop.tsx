import { AuthStarfieldDecor } from '@/components/auth/auth-starfield-decor'
import { AUTH_SCENIC_BG_DAY, AUTH_SCENIC_BG_NIGHT } from '@/lib/auth/scenic-backdrop-assets'

/**
 * Shared day/night scenic art + twinkling star layers + constellations (login / sign-up).
 */
export function AuthScenicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="login-scenic-bg absolute inset-0 bg-stone-100 dark:hidden"
        style={{ backgroundImage: `url('${AUTH_SCENIC_BG_DAY}')` }}
      />
      <div
        className="login-scenic-bg login-scenic-bg-night absolute inset-0 hidden bg-slate-950 dark:block"
        style={{ backgroundImage: `url('${AUTH_SCENIC_BG_NIGHT}')` }}
      />
      <AuthStarfieldDecor intensity="full" />
    </div>
  )
}
