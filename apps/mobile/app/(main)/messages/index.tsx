import { DrawerActions, useNavigation } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { theme } from '@/constants/theme'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { openUrlSafe } from '@/lib/open-url'
import { supabase } from '@/lib/supabase'

type Conv = {
  id?: string
  chatId?: string
  user?: { id?: string | number; username?: string; name?: string }
  lastMessage?: { text?: string; createdAt?: string }
  unreadCount?: number
}

type InboxSegment = 'chats' | 'insights'

function dashboardOrigin(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
}

export default function MessagesListScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { stats, loading: statsLoading } = useDashboardStats()

  const [items, setItems] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segment, setSegment] = useState<InboxSegment>('chats')
  const [overflowOpen, setOverflowOpen] = useState(false)

  const openDrawer = useCallback(() => {
    const parent = navigation.getParent()
    if (parent) parent.dispatch(DrawerActions.openDrawer())
    else navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/onlyfans/conversations?limit=50')
    const json = (await res.json()) as {
      conversations?: Conv[]
      error?: string
      message?: string
      code?: string
    }
    if (!res.ok) {
      setError(formatApiScreenError(res.status, json.error, json.message))
      setItems([])
      return
    }
    setItems(json.conversations ?? [])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await supabase.auth.refreshSession()
    await load()
    setRefreshing(false)
  }

  function openThread(item: Conv) {
    const id = item.chatId ?? item.user?.id
    if (id == null) return
    const fanId = String(id)
    const u = item.user?.username ?? item.user?.name ?? 'fan'
    router.push({
      pathname: '/(main)/messages/[fanId]',
      params: { fanId, fanUsername: String(u) },
    })
  }

  const base = dashboardOrigin()
  const massDmUrl = `${base}/dashboard/messages/mass`
  const messagesWebUrl = `${base}/dashboard/messages`

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.gold} />
        </View>
      </SafeAreaView>
    )
  }

  const subtitleChats =
    items.length === 0
      ? 'OnlyFans — connect in Settings to load threads.'
      : `${items.length} chat${items.length === 1 ? '' : 's'} · OnlyFans`

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.chrome}>
        <View style={styles.row1}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={openDrawer}
          >
            <FontAwesome name="bars" size={18} color={theme.text} />
          </Pressable>
          <View style={styles.titleBlock}>
            <View style={styles.chatsPill}>
              <FontAwesome name="columns" size={12} color={theme.textMuted} />
              <Text style={styles.chatsPillText}>Chats</Text>
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.titleMain} numberOfLines={1}>
                Inbox
              </Text>
              <Text style={styles.titleSub} numberOfLines={1}>
                {segment === 'insights' ? 'Direct & mass performance (summary)' : subtitleChats}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More actions"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => setOverflowOpen(true)}
          >
            <FontAwesome name="ellipsis-h" size={18} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.row2}>
          <View style={styles.segment}>
            <Pressable
              style={({ pressed }) => [
                styles.segBtn,
                segment === 'chats' && styles.segBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setSegment('chats')}
            >
              <FontAwesome
                name="comment-o"
                size={13}
                color={segment === 'chats' ? theme.text : theme.textDim}
              />
              <Text style={[styles.segLabel, segment === 'chats' && styles.segLabelActive]}>Chats</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.segBtn,
                segment === 'insights' && styles.segBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setSegment('insights')}
            >
              <FontAwesome
                name="bar-chart-o"
                size={13}
                color={segment === 'insights' ? theme.text : theme.textDim}
              />
              <Text style={[styles.segLabel, segment === 'insights' && styles.segLabelActive]}>
                Insights
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.massBtn, pressed && styles.pressed]}
            onPress={() => void openUrlSafe(massDmUrl)}
          >
            <FontAwesome name="bullhorn" size={13} color={theme.gold} />
            <Text style={styles.massBtnText}>Mass</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {segment === 'chats' ? (
        <FlatList
          data={items}
          style={styles.list}
          keyExtractor={(item, i) => String(item.chatId ?? item.user?.id ?? item.id ?? i)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ? 'Fix the error above or connect OnlyFans in Settings.' : 'No conversations yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => openThread(item)}
            >
              <Text style={styles.cardTitle}>@{item.user?.username ?? item.user?.name ?? 'Fan'}</Text>
              {item.lastMessage?.text ? (
                <Text style={styles.body} numberOfLines={2}>
                  {item.lastMessage.text}
                </Text>
              ) : null}
              {item.unreadCount ? <Text style={styles.unread}>{item.unreadCount} unread</Text> : null}
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerHint}>
                Mass targeting, PPV bundles, and full engagement charts live on the web inbox.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.footerBtn, pressed && styles.pressed]}
                onPress={() => void openUrlSafe(messagesWebUrl)}
              >
                <Text style={styles.footerBtnText}>Open web inbox</Text>
              </Pressable>
            </View>
          }
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.insightsPad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
        >
          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <FontAwesome name="bar-chart" size={16} color={theme.circe} />
              <Text style={styles.insightsTitle}>Insights</Text>
            </View>
            <Text style={styles.insightsBody}>
              Native inbox shows a quick snapshot. Open the web dashboard for message engagement, mass performance,
              and filters.
            </Text>
            {statsLoading ? (
              <ActivityIndicator color={theme.gold} style={{ marginTop: 12 }} />
            ) : stats ? (
              <View style={styles.statGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statVal}>{stats.activeConversations}</Text>
                  <Text style={styles.statLbl}>Active signal</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statVal}>{stats.totalFans}</Text>
                  <Text style={styles.statLbl}>Fans (snap)</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statVal}>{stats.hasConnectedPlatforms ? 'Yes' : 'No'}</Text>
                  <Text style={styles.statLbl}>Platforms</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statVal} numberOfLines={1}>
                    {stats.totalRevenue > 0 ? `~${Math.round(stats.totalRevenue)}` : '—'}
                  </Text>
                  <Text style={styles.statLbl}>Revenue (30d)</Text>
                </View>
              </View>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.footerBtn, pressed && styles.pressed, { marginTop: 16 }]}
              onPress={() => void openUrlSafe(messagesWebUrl)}
            >
              <Text style={styles.footerBtnText}>Full insights on web</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <Modal transparent visible={overflowOpen} animationType="fade" onRequestClose={() => setOverflowOpen(false)}>
        <Pressable style={styles.overflowBackdrop} onPress={() => setOverflowOpen(false)}>
          <Pressable style={styles.overflowSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.overflowTitle}>Inbox actions</Text>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                void onRefresh()
              }}
            >
              <FontAwesome name="refresh" size={16} color={theme.gold} />
              <Text style={styles.overflowItemText}>Refresh inbox</Text>
            </Pressable>
            <Pressable
              style={styles.overflowItem}
              onPress={() => {
                setOverflowOpen(false)
                void openUrlSafe(messagesWebUrl)
              }}
            >
              <FontAwesome name="external-link" size={16} color={theme.gold} />
              <Text style={styles.overflowItemText}>Open web inbox</Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chrome: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  titleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  chatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chatsPillText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  titleTextCol: { flex: 1, minWidth: 0 },
  titleMain: { fontSize: 16, fontWeight: '700', color: theme.text },
  titleSub: { fontSize: 11, color: theme.textDim, marginTop: 2 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segBtnActive: {
    backgroundColor: theme.surfaceElevated,
  },
  segLabel: { fontSize: 13, fontWeight: '600', color: theme.textDim },
  segLabelActive: { color: theme.text },
  massBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  massBtnText: { fontSize: 13, fontWeight: '700', color: theme.gold },
  err: { color: theme.danger, paddingHorizontal: 16, paddingVertical: 8 },
  list: { flex: 1 },
  empty: { color: theme.textDim, textAlign: 'center', padding: 24 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  body: { fontSize: 14, color: theme.textMuted, marginTop: 6 },
  unread: { fontSize: 12, color: theme.gold, marginTop: 6 },
  footer: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 32 },
  footerHint: { fontSize: 12, color: theme.textDim, marginBottom: 10, lineHeight: 18 },
  footerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  footerBtnText: { color: theme.gold, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.88 },
  insightsPad: { padding: 16, paddingBottom: 32 },
  insightsCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  insightsTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  insightsBody: { fontSize: 14, color: theme.textMuted, lineHeight: 20 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  statCell: {
    width: '47%',
    backgroundColor: theme.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statVal: { fontSize: 20, fontWeight: '700', color: theme.text },
  statLbl: { fontSize: 12, color: theme.textDim, marginTop: 4 },
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
