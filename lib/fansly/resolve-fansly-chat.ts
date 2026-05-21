import { createFanslyAPI } from '@/lib/fansly-api'
import { digRecord } from '@/lib/messages/fansly-thread-map'

type FanslyApiClient = ReturnType<typeof createFanslyAPI>

function parseFanslyChatRow(chat: unknown): { id: string; userId: string } | null {
  const o = digRecord(chat)
  if (!o || o.id == null) return null
  const u = digRecord(o.user)
  const userId = u?.id != null ? String(u.id) : ''
  return { id: String(o.id), userId }
}

/**
 * Resolve `fanId` path param to a chat id + peer user id (fan’s Fansly user id).
 * Accepts either the Fansly chat id or the fan’s user id.
 */
export async function resolveFanslyChat(
  api: FanslyApiClient,
  paramId: string,
): Promise<{ chatId: string; peerUserId: string } | null> {
  const id = String(paramId).trim()
  if (!id) return null
  const result = await api.getChats({ limit: 200, offset: 0 })
  const chats = Array.isArray(result.data) ? result.data : []
  for (const c of chats) {
    const row = parseFanslyChatRow(c)
    if (row && row.id === id) {
      return { chatId: row.id, peerUserId: row.userId || id }
    }
  }
  for (const c of chats) {
    const row = parseFanslyChatRow(c)
    if (row && row.userId === id) {
      return { chatId: row.id, peerUserId: row.userId }
    }
  }
  return null
}
