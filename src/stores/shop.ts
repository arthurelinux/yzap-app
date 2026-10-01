import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storeApi, type StoreInfo } from '@/api/store'
import { ApiError } from '@/api/client'
import { loadDashboardCache, saveDashboardCache } from '@/composables/secureSession'

/**
 * Loja (grupo 2 — leitura nesta fase). Offline: só cache de leitura com
 * aviso de dado desatualizado (`stale=true`).
 */
export interface PlanBlock {
  plan: string | null
  feature: string | null
  message: string
}

export const useShopStore = defineStore('shop', () => {
  const store = ref<StoreInfo | null>(null)
  const busy = ref(false)
  const stale = ref(false)
  const cachedAt = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  /** 403 de plano (com plan/feature) — distinto de 403 de permissão. */
  const planBlock = ref<PlanBlock | null>(null)
  /** 403 de permissão (sem plan/feature). */
  const permissionDenied = ref(false)

  const accentColor = computed(() => store.value?.accent_color || '#087f6f')

  /** Aplica uma loja atualizada vinda da API (após salvar configurações). */
  function applyStore(data: StoreInfo) {
    store.value = data
  }

  async function load() {
    busy.value = true
    lastError.value = null
    planBlock.value = null
    permissionDenied.value = false
    try {
      const { data } = await storeApi.get()
      store.value = data
      stale.value = false
      cachedAt.value = null
      await saveDashboardCache(data)
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 403) {
        if (e.isPlanBlock) {
          planBlock.value = {
            plan: e.body.plan ?? null,
            feature: e.body.feature ?? null,
            message: e.message,
          }
        } else {
          permissionDenied.value = true
        }
        throw e
      }
      // Sem internet: mostra cache com aviso.
      const cached = await loadDashboardCache<StoreInfo>()
      if (cached) {
        store.value = cached.payload
        stale.value = true
        cachedAt.value = cached.savedAt
        lastError.value = 'Sem conexão — mostrando dados em cache.'
      } else {
        lastError.value = e instanceof Error ? e.message : 'Falha ao carregar a loja'
        throw e
      }
    } finally {
      busy.value = false
    }
  }

  return {
    store,
    busy,
    stale,
    cachedAt,
    lastError,
    planBlock,
    permissionDenied,
    accentColor,
    load,
    applyStore,
  }
})
