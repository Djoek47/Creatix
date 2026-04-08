import * as Linking from 'expo-linking'

/** Opens http(s) URLs in the browser or mailto: in the system mail composer. Returns false if invalid or cannot open. */
export async function openUrlSafe(raw: string): Promise<boolean> {
  const u = raw.trim()
  if (!/^https?:\/\//i.test(u) && !/^mailto:/i.test(u)) return false
  try {
    const can = await Linking.canOpenURL(u)
    if (!can) return false
    await Linking.openURL(u)
    return true
  } catch {
    return false
  }
}
