'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TwoFactorSection } from '@/components/settings/two-factor-section'
import { SecurityPlatformStatus } from '@/components/settings/security-platform-status'
import { useTranslations } from 'next-intl'

export function SecuritySettings() {
  const t = useTranslations('settings')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  async function handlePasswordUpdate() {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordMessage({ type: 'error', text: t('securityCard.errors.fillBoth') })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: t('securityCard.errors.newTooShort') })
      return
    }
    setPasswordLoading(true)
    setPasswordMessage(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      setPasswordMessage({ type: 'error', text: t('securityCard.errors.noEmail') })
      setPasswordLoading(false)
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordMessage({ type: 'error', text: signInError.message || t('securityCard.errors.currentWrong') })
      setPasswordLoading(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setPasswordMessage({ type: 'error', text: updateError.message || t('securityCard.errors.updateFailed') })
      setPasswordLoading(false)
      return
    }
    setPasswordMessage({ type: 'success', text: t('securityCard.successUpdated') })
    setCurrentPassword('')
    setNewPassword('')
    setPasswordLoading(false)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5" aria-hidden />
          {t('securityCard.title')}
        </CardTitle>
        <CardDescription>{t('securityCard.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SecurityPlatformStatus />
        <Separator className="bg-border/70" />

        <div className="space-y-3">
          <Label className="text-[13px] font-medium tracking-tight text-foreground">
            {t('securityCard.passwordHeading')}
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="password"
              placeholder={t('securityCard.currentPasswordPlaceholder')}
              className="bg-input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t('securityCard.newPasswordPlaceholder')}
              className="bg-input"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          {passwordMessage ? (
            <p
              className={`text-[13px] ${passwordMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
            >
              {passwordMessage.text}
            </p>
          ) : null}
          <Button variant="outline" className="min-h-11" onClick={handlePasswordUpdate} disabled={passwordLoading}>
            {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('securityCard.updatePassword')}
          </Button>
        </div>

        <Separator className="bg-border/70" />

        <TwoFactorSection />
      </CardContent>
    </Card>
  )
}
