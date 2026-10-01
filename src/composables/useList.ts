import { computed, reactive, ref, shallowRef } from 'vue'
import { apiMessage } from './errors'

/** Coleção paginada do contrato: `{"data": [...], "meta": {current_page, per_page, total, last_page?}}`. */
export interface ListMeta {
  current_page: number
  per_page: number
  total: number
  last_page?: number
  [key: string]: unknown
}

export interface ListEnvelope<T> {
  data: T[]
  meta: ListMeta
}

/**
 * Lista paginada com scroll infinito (ion-infinite-scroll).
 * `fetchPage` recebe a página (1-based) e devolve o envelope do contrato.
 * Erros ficam em `error` (mensagem) e são relançados p/ quem quiser rotear
 * 401/403 (use `routeApiError`).
 */
export function useList<T>(fetchPage: (page: number) => Promise<ListEnvelope<T>>) {
  // shallowRef + sempre atribui��o de array novo (nunca push in-place).
  const items = shallowRef<T[]>([])
  const total = ref(0)
  const page = ref(1)
  const busy = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => items.value.length < total.value)

  async function refresh(): Promise<void> {
    busy.value = true
    error.value = null
    try {
      const env = await fetchPage(1)
      items.value = env.data
      total.value = Number(env.meta?.total ?? env.data.length)
      page.value = env.meta?.current_page ?? 1
    } catch (e: unknown) {
      error.value = apiMessage(e)
      throw e
    } finally {
      busy.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (busy.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    error.value = null
    try {
      const next = page.value + 1
      const env = await fetchPage(next)
      items.value = items.value.concat(env.data)
      total.value = Number(env.meta?.total ?? items.value.length)
      page.value = env.meta?.current_page ?? next
    } catch (e: unknown) {
      error.value = apiMessage(e)
      throw e
    } finally {
      loadingMore.value = false
    }
  }

  // reactive: refs aninhados fazem unwrap no template (list.items sem .value).
  return reactive({ items, total, page, busy, loadingMore, error, hasMore, refresh, loadMore })
}
