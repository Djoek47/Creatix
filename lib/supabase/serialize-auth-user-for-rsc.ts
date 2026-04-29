import type { User } from '@supabase/supabase-js'

/**
 * Ensures the Supabase `User` is JSON-serializable for Next.js Server → Client Component props.
 * After checkout / trial, JWT payloads can include extra nested fields that break Flight encoding.
 */
export function serializeAuthUserForRsc(user: User): User {
  try {
    return JSON.parse(JSON.stringify(user)) as User
  } catch {
    return user
  }
}
