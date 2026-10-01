// Grupo 6 — Estoque (contrato § Grupo 6, linhas 254-259).
// Permissão `stock` + feature `stock` + pago; escrita exige `Idempotency-Key`.
// Movimentos são IMUTÁVEIS: só criamos ajuste, nunca editamos/apagamos.
import { api, qs, newIdempotencyKey } from './client'
import type { ListEnvelope } from '@/composables/useList'

export interface StockLine {
  product_id: number
  product_name: string
  code?: string | null
  uses_variants?: boolean
  balance: number | null
  low?: boolean
  stock_min?: number | null
  image_url?: string | null
  variants?: Array<{ id: number; code?: string | null; stock?: number | null; is_active?: boolean }>
}

export interface StockAdjustResult {
  movement_id: number
  type: 'adjustment_in' | 'adjustment_out'
  quantity: number
  balance_after: number
}

export const stockApi = {
  /** GET /stock — meta traz `low_count`/`zeroed_count` junto do total. */
  list(params: {
    search?: string
    category_id?: number
    only_zeroed?: boolean
    only_low?: boolean
    page?: number
    per_page?: number
  }) {
    return api.get<ListEnvelope<StockLine>>(`/stock${qs(params)}`)
  },

  /**
   * POST /stock/adjust/{product} — único caminho com histórico (movimento
   * imutável). Produto com variantes EXIGE `variant_id` ativo (422).
   */
  adjust(
    productId: number | string,
    body: {
      type: 'adjustment_in' | 'adjustment_out'
      quantity: number
      reason: string
      variant_id?: number | null
    },
  ) {
    return api.post<{ data: StockAdjustResult }>(`/stock/adjust/${productId}`, body, {
      idempotencyKey: newIdempotencyKey(),
    })
  },
}
