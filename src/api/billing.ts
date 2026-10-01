import { api } from './client'

/**
 * Grupo 5 — Billing ✅ Documentado (contrato § Grupo 5).
 * Mercado Pago SEMPRE externo: checkout devolve {checkout_url, payment_id};
 * o app abre no navegador do sistema e volta por deeplink. O status real vem
 * de GET /billing/status/{payment} (linha atualizada pelo WEBHOOK — única
 * fonte de verdade). O app NUNCA ativa plano localmente.
 */

export type BillingPeriod = 'monthly' | 'semiannual' | 'annual'

export interface BillingPlan {
  id: number
  name: string
  slug: string
  is_free: boolean
  is_active: boolean
  prices: {
    monthly: number | null
    semiannual: number | null
    annual: number | null
  }
  limits: {
    max_products: number | null
    max_categories: number | null
    max_images_per_product: number | null
    max_notifications_per_month: number | null
    max_users: number | null
  }
  features: {
    finance: boolean
    stock: boolean
    delivery_maps: boolean
  }
  benefits: string[]
}

export interface BillingPayment {
  id: number
  plan: { id: number; name: string; slug: string }
  period: string
  period_label: string
  amount: number
  status: string
  paid_at: string | null
  created_at: string
}

export const billingApi = {
  plans() {
    return api.get<{
      data: {
        plans: BillingPlan[]
        current: { plan: string | null; access_expires_at: string | null }
      }
    }>('/plans')
  },

  /** Preferência MP criada no servidor; devolve SÓ checkout_url + payment_id. */
  checkout(planId: number, period: BillingPeriod) {
    return api.post<{ data: { checkout_url: string; payment_id: number } }>('/billing/checkout', {
      plan_id: planId,
      period,
    })
  },

  status(paymentId: number | string) {
    return api.get<{ data: BillingPayment }>(`/billing/status/${paymentId}`)
  },
}
