import { api } from './client'

/**
 * Grupo Maps — Área de atendimento ✅ Documentado (contrato § Grupo Maps).
 * GET/PUT /maps — Auth + `active` + plano pago com feature `delivery_maps` +
 * permissão `delivery_maps` em todas. 403 com `plan`+`feature` → upgrade;
 * 403 sem → permissão. Chaves do Google nunca vêm na resposta
 * (só `maps_api_configured`). Coordenadas do PUT são opcionais: sem elas o
 * servidor geocodifica o endereço da loja (o app não tem mapa nativo —
 * fase futura — então nunca envia pino, só toggles + raio).
 */

export type MapsBadgeKey = 'both' | 'pickup_only' | 'delivery_only' | 'disabled'

export interface MapsStatusBadge {
  key: MapsBadgeKey
  label: string
}

export interface MapsInfo {
  pickup_enabled: boolean
  delivery_enabled: boolean
  maps_enabled: boolean
  maps_radius_km: number | null
  origin: {
    latitude: number
    longitude: number
    geocoded_at: string | null
  } | null
  store_address: string | null
  has_address: boolean
  status_badge: MapsStatusBadge
  radius_active: boolean
  maps_api_configured: boolean
  geocode_warning: string | null
}

/**
 * PUT /maps — toggles ausentes = `false` (como o form do painel), então o app
 * envia SEMPRE os três booleans + o raio. Sem `maps_latitude/longitude` o
 * servidor geocodifica o endereço da loja.
 */
export interface MapsPayload {
  pickup_enabled: boolean
  delivery_enabled: boolean
  maps_enabled: boolean
  maps_radius_km: number
}

export const mapsApi = {
  get() {
    return api.get<{ data: MapsInfo }>('/maps')
  },

  async update(payload: MapsPayload): Promise<MapsInfo> {
    const { data } = await api.put<{ data: MapsInfo }>('/maps', payload)
    return data
  },
}
