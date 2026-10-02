// Grupo 6 — Financeiro + Caixa (contrato § Grupo 6, linhas 261-275).
// Permissão `finance` + pago; TODA escrita exige `Idempotency-Key`.
import { api, qs, newIdempotencyKey } from './client'
import type { ListEnvelope } from '@/composables/useList'

/** 10 chaves de categoria de `CatalogExpense::CATEGORIES` (modelo do painel). */
export const EXPENSE_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'aluguel', label: 'Aluguel' },
  { key: 'energia_agua', label: 'Energia e água' },
  { key: 'insumos', label: 'Insumos e mercadorias' },
  { key: 'marketing', label: 'Marketing e divulgação' },
  { key: 'folha', label: 'Folha de pagamento' },
  { key: 'impostos', label: 'Impostos e taxas' },
  { key: 'frete', label: 'Frete e entregas' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'outros', label: 'Outros' },
]

export interface Expense {
  id: number
  description: string
  category: string
  category_label?: string
  amount: number | string
  due_date?: string | null
  status: 'pending' | 'paid' | 'cancelled'
  status_label?: string
  paid_at?: string | null
  notes?: string | null
  receipt_url?: string | null
  created_at?: string
}

export interface RevenueRow {
  id: number
  number?: string
  total?: number
  payment_method?: string | null
  paid_at?: string | null
  created_at?: string
}

export interface Cashflow {
  income: number
  expense: number
  result: number
  payable?: number
  by_category?: Array<{ key: string; label: string; total: number }>
}

export interface CashMovement {
  id: number
  type: 'in' | 'out'
  amount: number
  description: string
  created_at?: string
}

export interface CashShift {
  id: number
  status: string
  status_label?: string
  opening_amount?: number
  expected_amount?: number | null
  closing_amount?: number | null
  difference?: number | null
  opened_at?: string | null
  closed_at?: string | null
  notes?: string | null
  closing_notes?: string | null
  movements?: CashMovement[]
}

export interface CashState {
  open: CashShift | null
  breakdown?: Record<string, number | null> | null
  provider?: { enabled: boolean; configured: boolean; active: boolean }
  registers?: Array<{ id: number; status?: string; [key: string]: unknown }>
  meta?: Record<string, unknown>
}

export const financeApi = {
  // ---------- Despesas ----------
  expenses(params: {
    from?: string
    to?: string
    category?: string
    status?: string
    page?: number
    per_page?: number
  }) {
    return api.get<
      ListEnvelope<Expense> & { meta: { totals?: { pending?: number; paid?: number } } }
    >(`/finance/expenses${qs(params)}`)
  },

  /** POST multipart (description, category, amount, due_date, notes?, receipt?). */
  createExpense(fd: FormData, onProgress?: (pct: number) => void) {
    return api.upload<{ data: Expense }>('/finance/expenses', fd, 'POST', {
      idempotencyKey: newIdempotencyKey(),
      onProgress,
    })
  },

  /** PUT multipart parcial + `status?` + `remove_receipt?`. */
  updateExpense(id: number | string, fd: FormData, onProgress?: (pct: number) => void) {
    return api.upload<{ data: Expense }>(`/finance/expenses/${id}`, fd, 'PUT', {
      idempotencyKey: newIdempotencyKey(),
      onProgress,
    })
  },

  cancelExpense(id: number | string) {
    return api.patch<{ data: Expense }>(
      `/finance/expenses/${id}/cancel`,
      {},
      { idempotencyKey: newIdempotencyKey() },
    )
  },

  // ---------- Leitura ----------
  revenue(params: {
    from?: string
    to?: string
    payment_method?: string
    order_status?: string
    page?: number
    per_page?: number
  }) {
    return api.get<
      ListEnvelope<RevenueRow> & {
        meta: { summary?: { total: number; count: number; average: number } }
      }
    >(`/finance/revenue${qs(params)}`)
  },

  cashflow(params: { from?: string; to?: string } = {}) {
    return api.get<{ data: Cashflow }>(`/finance/cashflow${qs(params)}`)
  },

  // ---------- Caixa ----------
  cash(params: { page?: number; per_page?: number } = {}) {
    return api.get<{ data: CashState }>(`/cash${qs(params)}`)
  },

  openCash(body: { opening_amount: number; notes?: string }) {
    return api.post<{ data: CashShift }>('/cash/open', body, {
      idempotencyKey: newIdempotencyKey(),
    })
  },

  cashMovement(registerId: number | string, body: { type: 'in' | 'out'; amount: number; description: string }) {
    return api.post<{ data: CashMovement }>(`/cash/${registerId}/movements`, body, {
      idempotencyKey: newIdempotencyKey(),
    })
  },

  closeCash(registerId: number | string, body: { closing_amount: number; closing_notes?: string }) {
    return api.post<{ data: CashShift }>(`/cash/${registerId}/close`, body, {
      idempotencyKey: newIdempotencyKey(),
    })
  },
}
