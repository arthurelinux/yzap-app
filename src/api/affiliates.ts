// Grupo 11 — Afiliados (indicação) ✅ Documentado (contrato § Grupo 11).
// Só `auth` — SEM middleware `active` e SEM permissão de loja: a indicação é da
// conta (escopo por usuário), e a regra 8 do programa garante acompanhamento
// mesmo após o fim do próprio teste. Sem `Idempotency-Key` (só leitura).
import { api, qs } from './client'
import type { ListMeta } from '@/composables/useList'

export interface AffiliateRule {
  title: string
  text: string
}

export interface AffiliateStats {
  referrals: number
  testing: number
  eligible: number
  ineligible: number
  paid: number
  pending_amount: number
  paid_amount: number
  total_earned: number
}

export interface AffiliatePayout {
  configured: boolean
  method: string | null
  holder: string | null
  document: string | null
  pix_key_type: string | null
  pix_key: string | null
  bank: string | null
  branch: string | null
  account: string | null
  account_digit: string | null
}

export type ReferralStatus = 'testing' | 'eligible' | 'ineligible' | 'paid'

export interface Referral {
  id: number
  referred_name: string
  trial_ends_at: string | null
  status: ReferralStatus
  status_label: string
  subscription: { plan: string; amount: number } | null
  commission: number | null
  paid_at: string | null
}

export interface AffiliatePage {
  code: string
  link: string
  commission_rate: number
  how_it_works: AffiliateRule[]
  stats: AffiliateStats
  payout: AffiliatePayout
  referrals: Referral[]
}

export const affiliatesApi = {
  /** GET /affiliates — ?page&per_page (padrão 25, máx. 100). */
  page(params: { page?: number; per_page?: number }) {
    return api.get<{ data: AffiliatePage; meta: ListMeta }>(`/affiliates${qs(params)}`)
  },
}
