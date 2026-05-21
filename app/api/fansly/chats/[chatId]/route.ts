import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { fanslyRouteResolveChatId, requireFanslyMessagingApi } from '@/lib/fansly-chat-routes'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const supabase = await createRouteHandlerClient(_request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gate = await requireFanslyMessagingApi(supabase, user.id)
    if (!gate.ok) return gate.response

    const { chatId: raw } = await params
    const resolved = await fanslyRouteResolveChatId(gate.ctx.api, raw)
    if (resolved instanceof NextResponse) return resolved

    const data = await gate.ctx.api.hideOrDeleteChat(gate.ctx.accountId, resolved.chatId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[fansly/chats] DELETE', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete or hide chat' },
      { status: 500 },
    )
  }
}
