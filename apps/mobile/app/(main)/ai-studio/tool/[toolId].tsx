import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getToolMeta } from '@/constants/ai-tools-data'
import { theme } from '@/constants/theme'
import { apiFetch } from '@/lib/api'

export default function ToolRunnerScreen() {
  const { toolId } = useLocalSearchParams<{ toolId: string }>()
  const router = useRouter()
  const meta = typeof toolId === 'string' ? getToolMeta(toolId) : undefined
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!toolId || typeof toolId !== 'string') return
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      const res = await apiFetch('/api/ai/tool-run', {
        method: 'POST',
        body: JSON.stringify({ toolId, prompt: prompt.trim() || 'Give a short creative suggestion.' }),
      })
      const json = (await res.json()) as { content?: string; error?: string }
      if (!res.ok) {
        setError(json.error ?? res.statusText)
        return
      }
      setResult(json.content ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (!meta) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Unknown tool</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (meta.comingSoon) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.desc}>{meta.longDescription}</Text>
          <Text style={styles.muted}>This tool is not available yet. Check AI Studio on the web for updates.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  const webBase = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  const commenterUrl = webBase ? `${webBase}/dashboard/commenter` : ''
  const housekeepingUrl = webBase ? `${webBase}/dashboard/commenter?section=housekeeping` : ''

  if (toolId === 'commenter') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.desc}>{meta.longDescription}</Text>
          {commenterUrl ? (
            <Pressable
              style={styles.button}
              onPress={() => {
                void Linking.openURL(commenterUrl)
              }}
            >
              <Text style={styles.buttonText}>Open in browser</Text>
            </Pressable>
          ) : (
            <Text style={styles.error}>
              Set EXPO_PUBLIC_API_URL to your site origin, then open /dashboard/commenter in a browser.
            </Text>
          )}
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (toolId === 'housekeeping') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.desc}>{meta.longDescription}</Text>
          {housekeepingUrl ? (
            <Pressable
              style={styles.button}
              onPress={() => {
                void Linking.openURL(housekeepingUrl)
              }}
            >
              <Text style={styles.buttonText}>Open Housekeeping in browser</Text>
            </Pressable>
          ) : (
            <Text style={styles.error}>
              Set EXPO_PUBLIC_API_URL to your site origin, then open Commenter → Housekeeping in a browser.
            </Text>
          )}
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{meta.name}</Text>
          <Text style={styles.desc}>{meta.description}</Text>
          <TextInput
            style={styles.input}
            placeholder="Your prompt (required)"
            placeholderTextColor={theme.textDim}
            multiline
            value={prompt}
            onChangeText={setPrompt}
          />
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={run} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.bg} /> : <Text style={styles.buttonText}>Run</Text>}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {result ? <Text style={styles.result}>{result}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 8 },
  desc: { fontSize: 14, color: theme.textMuted, marginBottom: 16 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    color: theme.text,
    backgroundColor: theme.surface,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
  error: { color: theme.danger, marginBottom: 8 },
  result: { fontSize: 15, lineHeight: 22, color: theme.text },
  link: { color: theme.gold, fontSize: 16 },
  muted: { fontSize: 13, color: theme.textDim, marginTop: 8, lineHeight: 20 },
})
