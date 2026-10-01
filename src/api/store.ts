import { api } from './client'

/** Grupo 2 — Loja (leitura) ✅ Documentado (contrato § Grupo 2).
 * Escopo de escrita (settings/equipe) entra no próximo passo. */

export interface StoreInfo {
  id: number
  name: string
  slug: string
  sector: string | null
  sector_label: string | null
  whatsapp: string | null
  accent_color: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  public_url: string | null
  is_published: boolean
  is_owner: boolean
  permissions: string[]
  social: {
    instagram_url: string | null
    facebook_url: string | null
    tiktok_url: string | null
    youtube_url: string | null
  }
  address: {
    postal_code: string | null
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
  }
  fulfillment: {
    delivery_fee: number | null
    pickup_enabled: boolean
    delivery_enabled: boolean
  }
  opening_hours: Record<string, unknown> | null
  show_opening_hours: boolean
  mercado_pago: { enabled: boolean; has_public_key: boolean }
}

export const storeApi = {
  get() {
    return api.get<{ data: StoreInfo }>('/store')
  },
}
