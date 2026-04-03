'use client'

import { Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import Link from 'next/link'

export function DivineTextSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const panelCtx = useDivinePanel()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md divine-launcher-panel">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-serif">
            <MessageSquare className="h-5 w-5 text-purple-500" aria-hidden />
            Divine (text)
          </SheetTitle>
          <SheetDescription className="text-left text-xs leading-relaxed">
            Same manager as voice: tools, fans, and protocol — streaming chat shared across the dashboard. For
            automations and whale whisper, continue in{' '}
            <Link
              href="/dashboard/ai-studio/chatter"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => onOpenChange(false)}
            >
              AI Chatter
            </Link>
            .
          </SheetDescription>
        </SheetHeader>
        {!panelCtx ? (
          <p className="text-sm text-muted-foreground">Open Divine from the dashboard to use text chat.</p>
        ) : (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-[200px] flex-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-2 text-sm space-y-2">
              {panelCtx.chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ask about fans, revenue, notifications, DMCA, or your protocol list. Replies stream here and stay in
                  sync when you navigate.
                </p>
              ) : (
                panelCtx.chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[90%] rounded-lg px-2 py-1.5 ${
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted text-foreground'
                    }`}
                  >
                    {m.content}
                  </div>
                ))
              )}
            </div>
            {panelCtx.chatWorkingHint ? (
              <p className="text-[11px] text-muted-foreground">{panelCtx.chatWorkingHint}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                id="divine-chat-input"
                placeholder="Message your manager…"
                value={panelCtx.chatInput}
                onChange={(e) => panelCtx.setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void panelCtx.sendChat()
                  }
                }}
                disabled={panelCtx.chatLoading}
              />
              <Button
                size="sm"
                disabled={panelCtx.chatLoading || !panelCtx.chatInput.trim()}
                onClick={() => void panelCtx.sendChat()}
              >
                {panelCtx.chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
