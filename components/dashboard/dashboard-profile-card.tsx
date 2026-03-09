'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronDown, ChevronUp, Laptop, DollarSign, Gift, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RevenueAmount } from '@/lib/revenue-privacy-context'
import type { Profile } from '@/lib/types'

interface DashboardProfileCardProps {
  profile: Profile | null
  totalRevenue?: number
  connectedPlatforms?: string[]
}

const sections = [
  { id: 'platforms', label: 'Connected platforms', icon: Laptop },
  { id: 'revenue', label: 'Revenue summary', icon: DollarSign },
  { id: 'benefits', label: 'Creator benefits', icon: Gift },
  { id: 'content', label: 'Content performance', icon: FileText },
]

export function DashboardProfileCard({
  profile,
  totalRevenue = 0,
  connectedPlatforms = [],
}: DashboardProfileCardProps) {
  const [openId, setOpenId] = useState<string | null>('platforms')

  return (
    <div className="space-y-4">
      <Card variant="brand" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative p-6 pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-20 w-20 rounded-2xl border-2 border-border">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || 'Creator'} />
                  <AvatarFallback className="rounded-2xl bg-primary/20 text-lg font-semibold text-primary">
                    {profile?.full_name?.slice(0, 2).toUpperCase() || 'CR'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 rounded-lg bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground animate-gold-purple-bg">
                  <RevenueAmount value={totalRevenue} />
                </span>
              </div>
              <p className="mt-3 font-title text-lg font-semibold">{profile?.full_name || 'Creator'}</p>
              <p className="text-xs text-muted-foreground">{profile?.company_name || 'Content Creator'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        {sections.map((section) => {
          const isOpen = openId === section.id
          const Icon = section.icon
          return (
            <div
              key={section.id}
              className="brand-card overflow-hidden rounded-xl"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 tap-target"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {section.label}
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isOpen && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {section.id === 'platforms' && (
                    <p>{connectedPlatforms.length ? connectedPlatforms.join(', ') : 'No platforms connected yet.'}</p>
                  )}
                  {section.id === 'revenue' && (
                    <p>
                      Total earnings: <RevenueAmount value={totalRevenue} /> (all platforms)
                    </p>
                  )}
                  {section.id === 'benefits' && (
                    <p>Manage fans, content, and messages in one place. AI tools and leak protection included.</p>
                  )}
                  {section.id === 'content' && (
                    <p>View top-performing posts and schedule new content from the Content page.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
