import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, type SessionAccount, type SessionUser } from '@/api/auth'
import { configureApi } from '@/api/client'
import { clearToken, loadToken, saveToken } from '@/composables/secureSession'

/**
 * Sessão (grupo 1). O token vive em storage seguro; aqui fica só em memória.
 * 401 → limpa a sessão (via configureApi). Conta inativa → tela de renovação
 * (account.active=false + renewal_url), login mobile permite conta inativa.
 */
export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(null)
  const user = ref<SessionUser | null>(null)
  const account = ref<SessionAccount | null>(null)
  const abilities = ref<string[]>([])
  const hydrated = ref(false)
  const lastError = ref<string | null>(null)
  const busy = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const isActive = computed(() => account.value?.active ?? true)
  const isAdmin = computed(() => abilities.value.includes('mobile:admin'))

  function applySession(accessToken: string, u: SessionUser, a: SessionAccount, ab: string[]) {
    token.value = accessToken
    user.value = u
    account.value = a
    abilities.value = ab
  }

  function wireClient() {
    configureApi({
      getToken: () => token.value,
      onUnauthorized: () => {
        void clearSession()
      },
    })
  }

  async function login(email: string, password: string) {
    busy.value = true
    lastError.value = null
    try {
      wireClient()
      const { data } = await authApi.login(email, password)
      applySession(data.access_token, data.user, data.account, data.abilities)
      await saveToken(data.access_token)
    } catch (e: unknown) {
      lastError.value = e instanceof Error ? e.message : 'Falha no login'
      throw e
    } finally {
      busy.value = false
    }
  }

  /** id_token obtido via Google Sign-In nativo; verificação é SÓ no servidor. */
  async function loginWithGoogle(idToken: string) {
    busy.value = true
    lastError.value = null
    try {
      wireClient()
      const { data } = await authApi.loginWithGoogle(idToken)
      applySession(data.access_token, data.user, data.account, data.abilities)
      await saveToken(data.access_token)
    } catch (e: unknown) {
      lastError.value = e instanceof Error ? e.message : 'Falha no login Google'
      throw e
    } finally {
      busy.value = false
    }
  }

  async function hydrate() {
    if (hydrated.value) return
    wireClient()
    const saved = await loadToken()
    if (!saved) {
      hydrated.value = true
      return
    }
    token.value = saved
    try {
      const { data } = await authApi.me()
      user.value = data.user
      account.value = data.account
    } catch {
      // 401 já limpou via onUnauthorized; outros erros mantêm sessão p/ retry.
    }
    hydrated.value = true
  }

  async function refreshMe() {
    const { data } = await authApi.me()
    user.value = data.user
    account.value = data.account
  }

  async function logout(all = false) {
    try {
      if (all) await authApi.logoutAll()
      else await authApi.logout()
    } catch {
      /* token pode já estar revogado — limpa local de todo jeito */
    }
    await clearSession()
  }

  async function clearSession() {
    token.value = null
    user.value = null
    account.value = null
    abilities.value = []
    await clearToken()
  }

  return {
    token,
    user,
    account,
    abilities,
    hydrated,
    busy,
    lastError,
    isAuthenticated,
    isActive,
    isAdmin,
    login,
    loginWithGoogle,
    hydrate,
    refreshMe,
    logout,
    clearSession,
  }
})
