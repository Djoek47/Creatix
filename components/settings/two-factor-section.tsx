'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, Copy, Check } from 'lucide-react'

function qrSrc(raw: string): string {
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
}

function sessionAssuranceLabel(level: string): string {
  const key = level.toLowerCase()
  if (key === 'aal2') return 'Authenticator verified'
  if (key === 'aal1') return 'Password only'
  return level
}

export function TwoFactorSection() {
  const supabase = createClient()
  const [totpFactors, setTotpFactors] = useState<Factor[]>([])
  const [aal, setAal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollBusy, setEnrollBusy] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)

  /** Unverified enrollment in progress — survives re-renders; cleared after verify/cancel discard. */
  const pendingEnrollFactorIdRef = useRef<string | null>(null)

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secretBackup, setSecretBackup] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [surfaceMessage, setSurfaceMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [dialogMessage, setDialogMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data: lf, error: lfErr } = await supabase.auth.mfa.listFactors()
      if (!lfErr && lf?.data?.totp) {
        setTotpFactors([...lf.data.totp])
      } else if (!lfErr && lf?.data?.all) {
        setTotpFactors(lf.data.all.filter((f) => f.factor_type === 'totp' && f.status === 'verified'))
      } else {
        setTotpFactors([])
      }
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      setAal(assurance?.currentLevel ?? null)
    } catch {
      setTotpFactors([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function discardUnverifiedEnrollment(): Promise<void> {
    const id = pendingEnrollFactorIdRef.current
    pendingEnrollFactorIdRef.current = null
    if (!id) return
    try {
      await supabase.auth.mfa.unenroll({ factorId: id })
    } catch {
      /* already verified or revoked */
    }
  }

  const resetEnrollmentUi = useCallback(() => {
    setQrCode(null)
    setSecretBackup(null)
    setOtp('')
    setDialogMessage(null)
    setVerifyBusy(false)
    setEnrollBusy(false)
  }, [])

  const handleDialogOpenChange = async (next: boolean) => {
    if (!next) {
      await discardUnverifiedEnrollment()
      resetEnrollmentUi()
    }
    setDialogOpen(next)
  }

  async function handleStartEnroll() {
    setEnrollBusy(true)
    setDialogMessage(null)
    setQrCode(null)
    setSecretBackup(null)
    setOtp('')
    pendingEnrollFactorIdRef.current = null
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      })
      if (error || !data) {
        setSurfaceMessage({
          type: 'err',
          text:
            error?.message ??
            'Multi-factor enrollment is not available for this account right now. Try again later.',
        })
        setEnrollBusy(false)
        return
      }
      pendingEnrollFactorIdRef.current = data.id
      if (data.totp?.qr_code) setQrCode(data.totp.qr_code)
      if (data.totp?.secret) setSecretBackup(data.totp.secret)
      setDialogOpen(true)
    } catch {
      setSurfaceMessage({ type: 'err', text: 'Enrollment could not start. Try again shortly.' })
    } finally {
      setEnrollBusy(false)
    }
  }

  async function handleVerify() {
    const factorId = pendingEnrollFactorIdRef.current
    if (!factorId || otp.length !== 6) return
    setVerifyBusy(true)
    setDialogMessage(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: otp,
      })
      if (error) {
        setDialogMessage({
          type: 'err',
          text: error.message || 'Incorrect code.',
        })
        setVerifyBusy(false)
        return
      }
      pendingEnrollFactorIdRef.current = null
      await supabase.auth.refreshSession()
      resetEnrollmentUi()
      setDialogOpen(false)
      setSurfaceMessage({ type: 'ok', text: 'Authenticator linked.' })
      void refresh()
    } catch {
      setDialogMessage({ type: 'err', text: 'Verification failed unexpectedly.' })
    } finally {
      setVerifyBusy(false)
    }
  }

  async function handleRemoveFactor(factorId: string) {
    setRemoveId(factorId)
    setSurfaceMessage(null)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) {
        setSurfaceMessage({
          type: 'err',
          text: error.message || 'Could not remove this device. Sign in again and try once more.',
        })
      } else {
        setSurfaceMessage({ type: 'ok', text: 'Authenticator removed.' })
        void refresh()
      }
    } catch {
      setSurfaceMessage({ type: 'err', text: 'Could not remove factor.' })
    } finally {
      setRemoveId(null)
    }
  }

  async function copySecret() {
    if (!secretBackup) return
    await navigator.clipboard.writeText(secretBackup)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  const hasTotp = totpFactors.length > 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold tracking-tight text-foreground">Two-factor authentication</p>
              {loading ? null : (
                <Badge
                  variant={hasTotp ? 'outline' : 'secondary'}
                  className={
                    hasTotp
                      ? 'rounded-md border-emerald-500/45 bg-emerald-500/[0.13] px-2 py-0 text-[11px] font-medium uppercase tracking-wide text-emerald-700 shadow-none dark:border-emerald-400/40 dark:bg-emerald-500/[0.11] dark:text-emerald-400'
                      : 'rounded-md px-2 py-0 text-[11px] font-medium uppercase tracking-wide'
                  }
                >
                  {hasTotp ? 'On' : 'Off'}
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-xl text-[13px] leading-snug text-muted-foreground">
              Enter a short code from an authenticator app after your password. Passphrases you use elsewhere in the app
              for encrypted data are separate from this step.
            </p>
            {!loading && aal ? (
              <p className="mt-2 text-[10px] font-normal tracking-wide text-muted-foreground/65">
                Session · {sessionAssuranceLabel(aal)}
              </p>
            ) : null}
          </div>
        </div>
        {!loading && !hasTotp ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 shrink-0 px-5 text-[13px]"
            disabled={enrollBusy}
            onClick={() => void handleStartEnroll()}
          >
            {enrollBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Add authenticator
          </Button>
        ) : null}
      </div>

      {!loading && hasTotp ? (
        <ul className="space-y-2">
          {totpFactors.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{f.friendly_name || 'Authenticator'}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-[13px] text-muted-foreground hover:text-destructive"
                disabled={removeId !== null}
                onClick={() => void handleRemoveFactor(f.id)}
              >
                {removeId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {surfaceMessage?.type === 'ok' ? (
        <p className="text-[13px] text-emerald-600 dark:text-emerald-400">{surfaceMessage.text}</p>
      ) : null}
      {surfaceMessage?.type === 'err' ? <p className="text-[13px] text-destructive">{surfaceMessage.text}</p> : null}

      <Dialog open={dialogOpen} onOpenChange={(o) => void handleDialogOpenChange(o)}>
        <DialogContent className="max-w-[min(100vw-2rem,24rem)]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">Link authenticator</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Scan this QR code, then enter the six-digit code your app generates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {dialogMessage?.type === 'err' ? <p className="text-[13px] text-destructive">{dialogMessage.text}</p> : null}

            {qrCode ? (
              <div className="flex justify-center rounded-2xl border border-border/60 bg-background p-4">
                <img src={qrSrc(qrCode)} alt="" width={176} height={176} className="h-[176px] w-[176px] object-contain" />
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Preparing…</p>
            )}

            {secretBackup ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Cannot scan? Enter manually
                </p>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() => void copySecret()}
                >
                  <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-foreground">
                    {secretBackup}
                  </code>
                  {secretCopied ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  )}
                </button>
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Confirmation code
              </label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                aria-label="Six-digit authentication code"
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-11 w-10 text-[17px]" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 sm:justify-self-start"
              onClick={() => void handleDialogOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-[8rem]"
              disabled={otp.length !== 6 || verifyBusy}
              onClick={() => void handleVerify()}
            >
              {verifyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
