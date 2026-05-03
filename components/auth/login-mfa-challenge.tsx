'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type LoginMfaChallengeProps = {
  email: string
  onVerified: () => void
  onUseDifferentAccount: () => void
}

const otpSlotClass =
  'h-12 w-11 rounded-xl border border-border/80 bg-background/70 text-[17px] font-medium tabular-nums tracking-wide shadow-none transition-[border-color,box-shadow] first:rounded-xl first:border-l last:rounded-xl data-[active=true]:border-foreground/25 data-[active=true]:ring-[3px] data-[active=true]:ring-foreground/15 dark:bg-black/25'

export function LoginMfaChallenge({ email, onVerified, onUseDifferentAccount }: LoginMfaChallengeProps) {
  const tAuth = useTranslations('auth')
  const [otp, setOtp] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [loadingFactors, setLoadingFactors] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [switchingAccount, setSwitchingAccount] = useState(false)

  const supabase = createClient()

  const resolveTotpFactor = useCallback(async () => {
    setLoadingFactors(true)
    setInitError(null)
    try {
      const { data: factors, error: lfErr } = await supabase.auth.mfa.listFactors()
      if (lfErr || !factors) {
        setInitError(tAuth('mfaLoginErrorLoadFactors'))
        setFactorId(null)
        return
      }
      const totpList =
        'totp' in factors && Array.isArray((factors as { totp: Factor[] }).totp)
          ? (factors as { totp: Factor[] }).totp
          : null
      let verified: Factor[] = []
      if (totpList?.length) {
        verified = totpList.filter((f) => f.status === 'verified')
      } else if (Array.isArray(factors.all)) {
        verified = factors.all.filter((f) => f.factor_type === 'totp' && f.status === 'verified')
      }
      if (!verified.length) {
        setInitError(tAuth('mfaLoginErrorNoFactor'))
        setFactorId(null)
        return
      }
      setFactorId(verified[0].id)
    } catch {
      setInitError(tAuth('mfaLoginErrorLoadFactors'))
      setFactorId(null)
    } finally {
      setLoadingFactors(false)
    }
  }, [supabase, tAuth])

  useEffect(() => {
    void resolveTotpFactor()
  }, [resolveTotpFactor])

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault()
    const id = factorId
    if (!id || otp.length !== 6 || verifying) return
    setVerifyError(null)
    setVerifying(true)
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: id })
      if (chErr || !challenge) {
        setVerifyError(chErr?.message ?? tAuth('mfaLoginErrorDetail'))
        return
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: id,
        challengeId: challenge.id,
        code: otp,
      })
      if (vErr) {
        setVerifyError(vErr.message || tAuth('mfaLoginErrorDetail'))
        return
      }
      await supabase.auth.refreshSession()
      onVerified()
    } catch {
      setVerifyError(tAuth('mfaLoginErrorDetail'))
    } finally {
      setVerifying(false)
    }
  }

  async function handleDifferentAccount() {
    setSwitchingAccount(true)
    try {
      await supabase.auth.signOut()
      onUseDifferentAccount()
    } finally {
      setSwitchingAccount(false)
    }
  }

  return (
    <form onSubmit={(ev) => void handleVerify(ev)} className="space-y-6">
      {email ? (
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          {tAuth('mfaLoginAs', { email })}
        </p>
      ) : null}

      {initError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3.5 text-sm text-destructive"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
            <p className="min-w-0 text-xs leading-relaxed text-destructive/90">{initError}</p>
          </div>
        </div>
      ) : null}

      {verifyError && !initError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3.5 text-sm text-destructive"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium leading-snug text-destructive">{tAuth('mfaLoginErrorTitle')}</p>
              <p className="text-xs leading-relaxed text-destructive/85">{verifyError}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <Label className="text-[13px] font-medium text-foreground">{tAuth('mfaLoginCodeLabel')}</Label>
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(v) => {
            setOtp(v)
            setVerifyError(null)
          }}
          disabled={loadingFactors || !factorId || verifying}
          aria-label={tAuth('mfaLoginOtpAria')}
          containerClassName="justify-center"
        >
          <InputOTPGroup className="gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} className={otpSlotClass} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        type="submit"
        disabled={loadingFactors || !factorId || otp.length !== 6 || verifying || switchingAccount}
        className={cn(
          'h-12 w-full rounded-xl text-[15px] font-medium tracking-tight shadow-none',
          'bg-foreground text-background hover:bg-foreground/88',
          'dark:bg-white dark:text-slate-950 dark:hover:bg-white/90',
          'transition-[opacity,background-color,transform] duration-200 active:scale-[0.99]',
          'disabled:opacity-50',
        )}
      >
        {verifying ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin opacity-80" />
            {tAuth('mfaLoginVerifying')}
          </span>
        ) : (
          tAuth('mfaLoginVerify')
        )}
      </Button>

      <div className="pt-1 text-center">
        <button
          type="button"
          disabled={verifying || switchingAccount}
          onClick={() => void handleDifferentAccount()}
          className="text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {switchingAccount ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />
              {tAuth('mfaLoginSigningOut')}
            </span>
          ) : (
            tAuth('mfaLoginDifferentAccount')
          )}
        </button>
      </div>
    </form>
  )
}
