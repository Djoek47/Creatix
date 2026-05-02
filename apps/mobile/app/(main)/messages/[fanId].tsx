import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DivineVoiceVisual } from '@/components/divine-voice-visual'
import { theme } from '@/constants/theme'
import { useDivineQuick } from '@/contexts/divine-quick'
import { useDivineVoice } from '@/contexts/divine-voice'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { openUrlSafe } from '@/lib/open-url'

type MessagingReadPrefs = {
  auto_mark_on_open: boolean
  per_chat_overrides: Record<string, string>
}

async function loadMessagingReadPrefs(): Promise<MessagingReadPrefs> {
  const res = await apiFetch('/api/user/messaging-read-preferences')
  if (!res.ok) return { auto_mark_on_open: false, per_chat_overrides: {} }
  const j = (await res.json()) as {
    auto_mark_on_open?: boolean
    per_chat_overrides?: Record<string, string>
  }
  return {
    auto_mark_on_open: j.auto_mark_on_open === true,
    per_chat_overrides:
      typeof j.per_chat_overrides === 'object' && j.per_chat_overrides != null ? j.per_chat_overrides : {},
  }
}

function shouldAutoMarkOnlyFansChat(prefs: MessagingReadPrefs, fanId: string): boolean {
  const key = `onlyfans:${fanId}`
  const o = prefs.per_chat_overrides[key]
  if (o === 'auto') return true
  if (o === 'never') return false
  return prefs.auto_mark_on_open
}

type Msg = {
  id: string
  text?: string
  createdAt?: string
  fromUser?: { id?: string; username?: string; name?: string }
}

function dashboardOrigin(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
}

function fanInitial(username: string | undefined): string {
  const u = (username ?? 'F').replace(/^@/, '').trim()
  return (u[0] ?? '?').toUpperCase()
}

type TrayKey = 'ppv' | 'voice' | 'trace' | 'ai' | 'divine'

export default function MessageThreadScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { openDivinePopup } = useDivineQuick()
  const voice = useDivineVoice()
  const dismissVoicePending = voice.dismissPendingConfirmation
  const { fanId, fanUsername } = useLocalSearchParams<{ fanId: string; fanUsername?: string }>()
  const fid = typeof fanId === 'string' ? fanId : Array.isArray(fanId) ? fanId[0] : ''
  const uname = typeof fanUsername === 'string' ? fanUsername : Array.isArray(fanUsername) ? fanUsername[0] : ''
  const displayName = uname.replace(/^@/, '') || 'Fan'
  const [items, setItems] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [confirmingVoiceIntentId, setConfirmingVoiceIntentId] = useState<string | null>(null)
  const listRef = useRef<FlatList<Msg>>(null)

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!fid) return
      setError(null)
      const q = new URLSearchParams({ limit: '100' })
      if (opts?.refresh) q.set('refresh', '1')
      const res = await apiFetch(`/api/onlyfans/messages/${encodeURIComponent(fid)}?${q.toString()}`)
      const json = (await res.json()) as { messages?: Msg[]; error?: string; message?: string }
      if (!res.ok) {
        setError(formatApiScreenError(res.status, json.error, json.message))
        setItems([])
        return
      }
      setItems(json.messages ?? [])
      const prefs = await loadMessagingReadPrefs()
      if (shouldAutoMarkOnlyFansChat(prefs, fid)) {
        void apiFetch(`/api/onlyfans/chats/${encodeURIComponent(fid)}/read`, { method: 'POST' }).catch(
          () => undefined,
        )
      }
    },
    [fid],
  )

  useEffect(() => {
    if (!fid) return
    load().finally(() => setLoading(false))
  }, [fid, load])

  async function onRefresh() {
    setRefreshing(true)
    await load({ refresh: true })
    setRefreshing(false)
  }

  async function send() {
    const text = draft.trim()
    if (!text || !fid || sending) return
    setSending(true)
    setDraft('')
    try {
      const res = await apiFetch(`/api/onlyfans/messages/${encodeURIComponent(fid)}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        setError(formatApiScreenError(res.status, json.error, json.message))
        setDraft(text)
        return
      }
      await load({ refresh: true })
    } finally {
      setSending(false)
    }
  }

  const confirmVoiceIntent = useCallback(
    async (intentId: string) => {
      setConfirmingVoiceIntentId(intentId)
      try {
        const res = await apiFetch('/api/divine/intent', {
          method: 'POST',
          body: JSON.stringify({ intent_id: intentId, confirm: true }),
        })
        const data = (await res.json()) as { status?: string; summary?: string; error?: string; message?: string }
        if (res.ok && (data.status === 'executed' || data.status === 'already_handled')) {
          dismissVoicePending(intentId)
          Alert.alert(
            'Confirmed',
            data.summary?.trim() ? data.summary : 'Action confirmed.',
          )
        } else if (data.error) {
          Alert.alert('Confirm failed', data.error)
        } else {
          Alert.alert(
            'Confirm failed',
            formatApiScreenError(res.status, data.error, data.message),
          )
        }
      } catch {
        Alert.alert('Confirm failed', 'Network error. Try again.')
      } finally {
        setConfirmingVoiceIntentId(null)
      }
    },
    [dismissVoicePending],
  )

  const base = dashboardOrigin()
  const threadWebUrl = `${base}/dashboard/messages?fanId=${encodeURIComponent(fid)}`
  const massDmUrl = `${base}/dashboard/messages/mass`

  function onTrayPress(key: TrayKey) {
    switch (key) {
      case 'ppv':
        Alert.alert(
          'PPV & bundles',
          'Locked posts and bundle pricing are configured from the web inbox composer.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open web', onPress: () => void openUrlSafe(threadWebUrl) },
          ],
        )
        break
      case 'voice':
        if (!voice.voiceAvailable) {
          Alert.alert(
            'Divine voice',
            Platform.OS === 'web'
              ? 'Voice runs on iOS/Android builds with native WebRTC.'
              : 'Use an EAS development build with WebRTC. Expo Go does not include Divine voice.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Divine Manager',
                onPress: () => router.push('/(main)/divine-manager?section=voice'),
              },
            ],
          )
          break
        }
        void voice.startVoiceCall({ id: fid, username: displayName, name: displayName })
        break
      case 'trace':
        void openUrlSafe(threadWebUrl)
        break
      case 'ai':
        router.push('/(main)/ai-studio')
        break
      case 'divine':
        openDivinePopup()
        break
      default:
        break
    }
  }

  const isFromFan = (m: Msg) => String(m.fromUser?.id) === String(fid)

  if (!fid) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.err}>Missing chat id.</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.gold} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.threadChrome}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={18} color={theme.text} />
          </Pressable>
          <View style={styles.fanBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{fanInitial(displayName)}</Text>
            </View>
            <View style={styles.fanTextCol}>
              <Text style={styles.fanTitle} numberOfLines={1}>
                @{displayName}
              </Text>
              <Text style={styles.fanSub} numberOfLines={1}>
                OnlyFans · tap web for full profile
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More"
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => setOverflowOpen(true)}
          >
            <FontAwesome name="ellipsis-h" size={18} color={theme.text} />
          </Pressable>
        </View>

        {error ? <Text style={styles.bannerErr}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          style={styles.threadList}
          data={items}
          keyExtractor={(m) => String(m.id)}
          inverted
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{error ? ' ' : 'No messages yet. Send a reply below.'}</Text>
          }
          renderItem={({ item: m }) => (
            <View
              style={[styles.bubbleWrap, isFromFan(m) ? styles.bubbleAlignLeft : styles.bubbleAlignRight]}
            >
              <View style={[styles.bubble, isFromFan(m) ? styles.bubbleFan : styles.bubbleMe]}>
                <Text style={styles.bubbleText}>{m.text ?? ''}</Text>
                {m.createdAt ? <Text style={styles.meta}>{new Date(m.createdAt).toLocaleString()}</Text> : null}
              </View>
            </View>
          )}
        />
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
        {voice.voiceAvailable &&
        (voice.status === 'connecting' || voice.status === 'connected' || voice.status === 'error') ? (
          <View style={styles.voiceBar}>
            <View style={styles.voiceBarMain}>
              <Text style={styles.voiceBarTitle} numberOfLines={1}>
                Divine voice · @{displayName}
              </Text>
              {voice.status === 'error' && voice.error ? (
                <Text style={styles.voiceBarErr}>{voice.error}</Text>
              ) : voice.status === 'connecting' ? (
                <ActivityIndicator color={theme.gold} style={{ marginTop: 8 }} />
              ) : (
                <DivineVoiceVisual surface={voice.voiceSurfaceState} showBars={false} />
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.voiceBarEnd, pressed && styles.pressed]}
              onPress={() => voice.endVoiceCall()}
            >
              <Text style={styles.voiceBarEndText}>End</Text>
            </Pressable>
          </View>
        ) : null}

        {voice.pendingConfirmations.length > 0 ? (
          <View style={styles.pendingVoiceCard}>
            <View style={styles.pendingVoiceCardHeader}>
              <FontAwesome name="exclamation-triangle" size={14} color={theme.gold} />
              <Text style={styles.pendingVoiceCardTitle}>Confirm voice actions</Text>
            </View>
            {voice.pendingConfirmations.map((a) => (
              <View key={a.intent_id} style={styles.voiceIntentRow}>
                <Text style={styles.voiceIntentText} numberOfLines={4}>
                  {a.type}
                  {a.summary ? `: ${a.summary}` : ''}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.voiceConfirmBtn,
                    pressed && styles.pressed,
                    confirmingVoiceIntentId !== null && styles.voiceConfirmBtnDisabled,
                  ]}
                  disabled={confirmingVoiceIntentId !== null}
                  onPress={() => void confirmVoiceIntent(a.intent_id)}
                >
                  {confirmingVoiceIntentId === a.intent_id ? (
                    <ActivityIndicator color={theme.gold} size="small" />
                  ) : (
                    <Text style={styles.voiceConfirmBtnText}>Confirm</Text>
                  )}
                </Pressable>
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [styles.pendingVoiceFooterLink, pressed && styles.pressed]}
              onPress={() => router.push('/(main)/divine-manager')}
            >
              <Text style={styles.pendingVoiceFooterLinkText}>Open Divine Manager</Text>
              <FontAwesome name="chevron-right" size={11} color={theme.textDim} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.intelStack}>
          <Pressable
            style={({ pressed }) => [styles.intelPill, pressed && styles.pressed]}
            onPress={() => router.push('/(main)/divine-manager?section=voice')}
          >
            <FontAwesome name="bolt" size={12} color={theme.gold} />
            <Text style={styles.intelPillText}>Divine · voice & automation</Text>
            <FontAwesome name="chevron-right" size={10} color={theme.textDim} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.intelPillSecondary, pressed && styles.pressed]}
            onPress={() => router.push('/(main)/divine-manager?section=chat')}
          >
            <FontAwesome name="magic" size={12} color={theme.circe} />
            <Text style={styles.intelPillTextDim}>Ariadne · reasoning & tools (manager)</Text>
          </Pressable>
        </View>

        <View style={styles.composer}>
          <View style={styles.inputRow}>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}
              onPress={() => {
                Alert.alert(
                  'Attachments',
                  'Sending photos and videos from the native inbox is not wired yet. Use the web composer for media.',
                  [
                    { text: 'OK', style: 'cancel' },
                    { text: 'Open web', onPress: () => void openUrlSafe(threadWebUrl) },
                  ],
                )
              }}
            >
              <FontAwesome name="paperclip" size={18} color={theme.textMuted} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor={theme.textDim}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={8000}
              editable={!sending}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && styles.pressed,
                sending && styles.sendDisabled,
                !draft.trim() && styles.sendDisabled,
              ]}
              onPress={() => void send()}
              disabled={sending || !draft.trim()}
            >
              <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
            </Pressable>
          </View>

          <View style={styles.trayRow}>
            <Pressable
              style={({ pressed }) => [styles.trayBtn, pressed && styles.pressed]}
              onPress={() => onTrayPress('ppv')}
            >
              <FontAwesome name="lock" size={16} color={theme.gold} />
              <Text style={styles.trayLabel}>PPV</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.trayBtn, pressed && styles.pressed]}
              onPress={() => onTrayPress('voice')}
            >
              <FontAwesome name="microphone" size={16} color={theme.text} />
              <Text style={styles.trayLabel}>Voice</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.trayBtn, pressed && styles.pressed]}
              onPress={() => onTrayPress('trace')}
            >
              <FontAwesome name="search" size={16} color={theme.text} />
              <Text style={styles.trayLabel}>Trace</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.trayBtn, pressed && styles.pressed]}
              onPress={() => onTrayPress('ai')}
            >
              <FontAwesome name="magic" size={16} color={theme.circe} />
              <Text style={styles.trayLabel}>AI</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.trayBtn, styles.trayBtnDivine, pressed && styles.pressed]}
              onPress={() => onTrayPress('divine')}
            >
              <FontAwesome name="bolt" size={16} color={theme.bg} />
              <Text style={styles.trayLabelLight}>Divine</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <Modal transparent visible={overflowOpen} animationType="fade" onRequestClose={() => setOverflowOpen(false)}>
        <Pressable style={styles.overflowBackdrop} onPress={() => setOverflowOpen(false)}>
          <Pressable style={styles.overflowSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.overflowTitle}>Chat actions</Text>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                void onRefresh()
              }}
            >
              <FontAwesome name="refresh" size={16} color={theme.gold} />
              <Text style={styles.overflowItemText}>Refresh thread</Text>
            </Pressable>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                void openUrlSafe(threadWebUrl)
              }}
            >
              <FontAwesome name="external-link" size={16} color={theme.gold} />
              <Text style={styles.overflowItemText}>Open on web inbox</Text>
            </Pressable>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                void openUrlSafe(massDmUrl)
              }}
            >
              <FontAwesome name="bullhorn" size={16} color={theme.gold} />
              <Text style={styles.overflowItemText}>Mass page (web)</Text>
            </Pressable>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                router.push('/(main)/settings')
              }}
            >
              <FontAwesome name="cog" size={16} color={theme.textMuted} />
              <Text style={styles.overflowItemText}>Settings</Text>
            </Pressable>
            <Pressable style={styles.overflowClose} onPress={() => setOverflowOpen(false)}>
              <Text style={styles.overflowCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  safe: { flex: 1, backgroundColor: theme.bg },
  composerSafe: { backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  threadChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  threadList: { flex: 1 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fanBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.text },
  fanTextCol: { flex: 1, minWidth: 0 },
  fanTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  fanSub: { fontSize: 11, color: theme.textDim, marginTop: 2 },
  bannerErr: { color: theme.danger, paddingHorizontal: 12, paddingVertical: 6 },
  listContent: { paddingHorizontal: 10, paddingVertical: 8 },
  empty: { color: theme.textDim, textAlign: 'center', padding: 24 },
  bubbleWrap: { marginBottom: 8, maxWidth: '96%' },
  bubbleAlignLeft: { alignSelf: 'flex-start' },
  bubbleAlignRight: { alignSelf: 'flex-end' },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  bubbleFan: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleMe: {
    backgroundColor: theme.circeMuted,
  },
  bubbleText: { color: theme.text, fontSize: 15 },
  meta: { color: theme.textDim, fontSize: 10, marginTop: 4 },
  intelStack: { paddingHorizontal: 10, paddingTop: 8, gap: 6 },
  intelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  intelPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  intelPillText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.text },
  intelPillTextDim: { flex: 1, fontSize: 12, fontWeight: '500', color: theme.textMuted },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  voiceBarMain: { flex: 1, minWidth: 0 },
  voiceBarTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
  voiceBarErr: { fontSize: 12, color: theme.danger, marginTop: 6 },
  voiceBarEnd: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  voiceBarEndText: { fontSize: 13, fontWeight: '700', color: theme.text },
  pendingVoiceCard: {
    marginHorizontal: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pendingVoiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pendingVoiceCardTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
  voiceIntentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  voiceIntentText: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  voiceConfirmBtn: {
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceConfirmBtnDisabled: { opacity: 0.55 },
  voiceConfirmBtnText: { color: theme.gold, fontWeight: '700', fontSize: 13 },
  pendingVoiceFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  pendingVoiceFooterLinkText: { fontSize: 12, color: theme.textDim, fontWeight: '600' },
  composer: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    backgroundColor: theme.surface,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: theme.gold,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: theme.bg, fontWeight: '700' },
  trayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  trayBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  trayBtnDivine: {
    backgroundColor: theme.gold,
    borderColor: theme.goldMuted,
  },
  trayLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted },
  trayLabelLight: { fontSize: 10, fontWeight: '700', color: theme.bg },
  err: { color: theme.danger, marginBottom: 8 },
  backBtn: { marginTop: 12 },
  backText: { color: theme.gold },
  pressed: { opacity: 0.88 },
  overflowBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overflowSheet: {
    borderRadius: 16,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  overflowTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
  overflowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  overflowItemText: { fontSize: 15, color: theme.text, fontWeight: '500' },
  overflowClose: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  overflowCloseText: { color: theme.textMuted, fontSize: 15 },
})
