import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 1800

// Prevents any single SecureStore call from hanging indefinitely.
// On new arch (TurboModules), getItemAsync can deadlock during early init.
function sc(promise) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
  ])
}

const ChunkedSecureStoreAdapter = {
  async getItem(key) {
    try {
      const chunkCountStr = await sc(SecureStore.getItemAsync(`${key}_chunks`))

      if (!chunkCountStr) {
        return sc(SecureStore.getItemAsync(key))
      }

      const chunkCount = parseInt(chunkCountStr, 10)
      let value = ''

      for (let i = 0; i < chunkCount; i++) {
        const chunk = await sc(SecureStore.getItemAsync(`${key}_${i}`))
        if (chunk === null) return null
        value += chunk
      }

      return value
    } catch {
      return null
    }
  },

  async setItem(key, value) {
    try {
      const existingChunkCountStr = await sc(SecureStore.getItemAsync(`${key}_chunks`))
      if (existingChunkCountStr) {
        const existingChunkCount = parseInt(existingChunkCountStr, 10)
        for (let i = 0; i < existingChunkCount; i++) {
          await sc(SecureStore.deleteItemAsync(`${key}_${i}`))
        }
      }
      await sc(SecureStore.deleteItemAsync(key))

      if (value.length <= CHUNK_SIZE) {
        await sc(SecureStore.deleteItemAsync(`${key}_chunks`))
        return sc(SecureStore.setItemAsync(key, value))
      }

      const chunks = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }

      await Promise.all(
        chunks.map((chunk, i) => sc(SecureStore.setItemAsync(`${key}_${i}`, chunk)))
      )

      return sc(SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length)))
    } catch {}
  },

  async removeItem(key) {
    try {
      const chunkCountStr = await sc(SecureStore.getItemAsync(`${key}_chunks`))

      if (chunkCountStr) {
        const chunkCount = parseInt(chunkCountStr, 10)
        for (let i = 0; i < chunkCount; i++) {
          await sc(SecureStore.deleteItemAsync(`${key}_${i}`))
        }
        await sc(SecureStore.deleteItemAsync(`${key}_chunks`))
      }

      return sc(SecureStore.deleteItemAsync(key))
    } catch {}
  },
}

const supabaseUrl = 'https://iaacctqzmvkysdzwhhvy.supabase.co'
const supabaseAnonKey = 'sb_publishable_JedKWmaQ6m39RtrQBEaZOA_ivonEydT'

// createClient() (with persistSession: true) touches SecureStore immediately on
// construction. On a cold start, TurboModules can still be finishing registration
// at that point and the call deadlocks the JS thread (works in Expo Go because its
// bridge is already warm). Deferring construction until first use — i.e. until
// after App's first render — keeps that access off the earliest-init window.
let _client = null
function getClient() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ChunkedSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return _client
}

export const supabase = new Proxy({}, {
  get(_target, prop) {
    const value = getClient()[prop]
    return typeof value === 'function' ? value.bind(_client) : value
  },
})
