'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { setFanslyEmailTwofaGrace } from '@/lib/fansly/fansly-twofa-session-grace'

export type FanslyEmailTwofaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Runs after ApiFansly verify succeeds (grace already set). Parent should close the dialog when done. */
  onVerified: () => void | Promise<void>
}

export function FanslyEmailTwofaDialog({ open, onOpenChange, onVerified }: FanslyEmailTwofaDialogProps) {
  const t = useTranslations('messages.fanslyEmailTwofa')
  const [twofaSessionToken, setTwofaSessionToken] = useState<string | null>(null)
  const [twofaMaskedEmail, setTwofaMaskedEmail] = useState<string | null>(null)
  const [twofaCode, setTwofaCode] = useState('')
  const [twofaSendBusy, setTwofaSendBusy] = useState(false)
  const [twofaVerifyBusy, setTwofaVerifyBusy] = useState(false)
  const [twofaError, setTwofaError] = useState<string | null>(null)

  const reset = () => {
    setTwofaSessionToken(null)
    setTwofaMaskedEmail(null)
    setTwofaCode('')
    setTwofaError(null)
    setTwofaSendBusy(false)
    setTwofaVerifyBusy(false)
  }

  useEffect(() => {
    if (!open) reset()
  }, [open])

  const handleDialogOpenChange = (next: boolean) => {
    onOpenChange(next)
  }

  const sendFanslyTwofaCode = async () => {
    setTwofaSendBusy(true)
    setTwofaError(null)
    try {
      const res = await fetch('/api/fansly/twofa/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useEmailTwoFAFallback: true }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        sessionToken?: string
        maskedEmail?: string
      }
      if (!res.ok || !data.sessionToken) {
        setTwofaError(data.error || t('errorSend'))
        return
      }
      setTwofaSessionToken(data.sessionToken)
      setTwofaMaskedEmail(typeof data.maskedEmail === 'string' ? data.maskedEmail : null)
    } catch {
      setTwofaError(t('errorSend'))
    } finally {
      setTwofaSendBusy(false)
    }
  }

  const verifyAndContinue = async () => {
    if (!twofaSessionToken || !twofaCode.trim()) return
    setTwofaVerifyBusy(true)
    setTwofaError(null)
    try {
      const res = await fetch('/api/fansly/twofa/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: twofaSessionToken,
          code: twofaCode.trim(),
          mode: 1,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setTwofaError(data.error || t('errorVerify'))
        return
      }
      setFanslyEmailTwofaGrace()
      await onVerified()
    } catch {
      setTwofaError(t('errorVerify'))
    } finally {
      setTwofaVerifyBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border-border/40 p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/30 bg-muted/20 px-6 py-6 text-left">
          <DialogTitle className="text-xl font-light tracking-tight">{t('title')}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-6">
          {twofaError ? (
            <p className="text-sm text-destructive" role="alert">
              {twofaError}
            </p>
          ) : null}
          {twofaMaskedEmail ? (
            <p className="text-sm text-muted-foreground">{t('masked', { email: twofaMaskedEmail })}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl"
            onClick={() => void sendFanslyTwofaCode()}
            disabled={twofaSendBusy || twofaVerifyBusy}
          >
            {twofaSendBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('sending')}
              </>
            ) : (
              t('sendCode')
            )}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="fansly-email-twofa-code">{t('codeLabel')}</Label>
            <Input
              id="fansly-email-twofa-code"
              value={twofaCode}
              onChange={(e) => setTwofaCode(e.target.value)}
              placeholder={t('codePlaceholder')}
              autoComplete="one-time-code"
              maxLength={16}
              disabled={!twofaSessionToken || twofaSendBusy || twofaVerifyBusy}
              className="h-10 rounded-xl border-border/50"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 border-t border-border/30 bg-muted/10 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => handleDialogOpenChange(false)}
            disabled={twofaSendBusy || twofaVerifyBusy}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            className="rounded-xl px-6"
            onClick={() => void verifyAndContinue()}
            disabled={
              twofaSendBusy || twofaVerifyBusy || !twofaSessionToken || twofaCode.trim().length < 4
            }
          >
            {twofaVerifyBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('verifyContinue')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
