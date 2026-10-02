import { api, qs } from './client'

/**
 * Grupo 2 — Loja ✅ Documentado (contrato § Grupo 2).
 * GET /store, PUT /store/settings, PUT /store/opening-hours,
 * GET /store/link-suggestions, equipe CRUD.
 *
 * NOTA DE TRANSPORTE: o contrato documenta `multipart/form-data` no
 * PUT /store/settings. O PHP NÃO parseia multipart em PUT (até 8.3; no 8.4
 * `request_parse_body()` passou a parsear). Por isso:
 * - escalares → PUT application/json (parseado pelo Laravel em qualquer PHP);
 * - imagens (logo/cover) → PUT multipart (única forma de enviar arquivo) e a
 *   página confere na resposta se a imagem foi de fato aplicada.
 */

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
  opening_hours: Record<string, OpeningDay> | null
  show_opening_hours: boolean
  mercado_pago: { enabled: boolean; has_public_key: boolean }
}

export interface OpeningDay {
  enabled: boolean
  all_day: boolean
  opens_at: string | null
  closes_at: string | null
}

/** Payload de PUT /store/settings (parcial; null limpa o campo nullable). */
export interface SettingsScalars {
  name?: string | null
  slug?: string | null
  whatsapp?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  tiktok_url?: string | null
  youtube_url?: string | null
  postal_code?: string | null
  address?: string | null
  address_number?: string | null
  address_complement?: string | null
  neighborhood?: string | null
  state_code?: string | null
  city_name?: string | null
  accent_color?: string | null
  description?: string | null
  is_published?: boolean
  delivery_fee?: string | null
}

export interface ImageFiles {
  logo?: File
  cover_image?: File
}

export interface LinkSuggestions {
  available: boolean
  suggestions: string[]
}

export interface TeamMember {
  id: number
  user_id: number
  name: string
  email: string
  permissions: string[]
  is_active: boolean
}

export interface TeamIndex {
  members: TeamMember[]
  slots: { used: number; max: number }
  /** chave → rótulo (vem da API, não é mock) */
  permissions: Record<string, string>
}

export interface TeamPayload {
  name?: string
  email?: string
  password?: string
  permissions?: string[]
  is_active?: boolean
}

export const storeApi = {
  get() {
    return api.get<{ data: StoreInfo }>('/store')
  },

  async updateSettings(payload: SettingsScalars): Promise<StoreInfo> {
    const { data } = await api.put<{ data: StoreInfo }>('/store/settings', payload)
    return data
  },

  /** Upload de logo/capa (multipart PUT — ver nota de transporte no topo). */
  async updateImages(files: ImageFiles, onProgress?: (pct: number) => void): Promise<StoreInfo> {
    const form = new FormData()
    if (files.logo) form.append('logo', files.logo)
    if (files.cover_image) form.append('cover_image', files.cover_image)
    const { data } = await api.upload<{ data: StoreInfo }>('/store/settings', form, 'PUT', {
      onProgress,
    })
    return data
  },

  updateOpeningHours(body: {
    show_opening_hours: boolean
    opening_hours: Record<string, OpeningDay>
  }) {
    return api.put<{ data: StoreInfo }>('/store/opening-hours', body)
  },

  linkSuggestions(params: { slug?: string; name?: string }) {
    return api.get<{ data: LinkSuggestions }>(`/store/link-suggestions${qs(params)}`)
  },

  team() {
    return api.get<{ data: TeamIndex }>('/store/team')
  },

  teamCreate(payload: TeamPayload) {
    return api.post<{ data: TeamMember }>('/store/team', payload)
  },

  /** ATENÇÃO: o backend grava `is_active` em TODO PUT — envie sempre o valor atual. */
  teamUpdate(memberId: number, payload: TeamPayload) {
    return api.put<{ data: TeamMember }>(`/store/team/${memberId}`, payload)
  },

  teamRemove(memberId: number) {
    return api.del<{ data: { removed: boolean } }>(`/store/team/${memberId}`)
  },
}
