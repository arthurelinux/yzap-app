import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { Preferences } from '@capacitor/preferences'

/**
 * Token SEMPRE no Keychain (iOS) / Keystore (Android) via
 * `capacitor-secure-storage-plugin`. Nunca em localStorage, nunca em log.
 *
 * No `web` (dev/preview no navegador) o plugin não tem Keychain — usa
 * `Preferences` (com aviso) ou memória. Em build nativo, o caminho seguro
 * é usado. Cache de LEITURA offline (dashboard) vai para `Preferences`
 * com flag de desatualizado — nunca o token.
 */

const TOKEN_KEY = 'yzap.access_token'
const NATIVE = Capacitor.isNativePlatform()

let memoryToken: string | null = null

export async function saveToken(token: string): Promise<void> {
  if (NATIVE) {
    await SecureStoragePlugin.set({ key: TOKEN_KEY, value: token })
    return
  }
  memoryToken = token
  try {
    await Preferences.set({ key: TOKEN_KEY, value: token })
  } catch {
    /* ambiente sem storage — mantém só em memória */
  }
}

export async function loadToken(): Promise<string | null> {
  if (NATIVE) {
    try {
      const { value } = await SecureStoragePlugin.get({ key: TOKEN_KEY })
      return value ?? null
    } catch {
      return null
    }
  }
  if (memoryToken) return memoryToken
  try {
    const { value } = await Preferences.get({ key: TOKEN_KEY })
    return value ?? null
  } catch {
    return null
  }
}

export async function clearToken(): Promise<void> {
  memoryToken = null
  if (NATIVE) {
    try {
      await SecureStoragePlugin.remove({ key: TOKEN_KEY })
    } catch {
      /* já ausente */
    }
    return
  }
  try {
    await Preferences.remove({ key: TOKEN_KEY })
  } catch {
    /* ok */
  }
}

/** Cache de leitura offline (dashboard). Sempre marcado como possivelmente desatualizado. */
const DASH_CACHE_KEY = 'yzap.cache.dashboard'

export async function saveDashboardCache(payload: unknown): Promise<void> {
  try {
    await Preferences.set({
      key: DASH_CACHE_KEY,
      value: JSON.stringify({ savedAt: new Date().toISOString(), payload }),
    })
  } catch {
    /* sem cache disponível */
  }
}

export async function loadDashboardCache<T>(): Promise<{
  savedAt: string
  payload: T
} | null> {
  try {
    const { value } = await Preferences.get({ key: DASH_CACHE_KEY })
    if (!value) return null
    return JSON.parse(value) as { savedAt: string; payload: T }
  } catch {
    return null
  }
}
