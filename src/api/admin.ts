// Grupo 4 do contrato — tudo sob a ability `mobile:admin` (sem ela: 403).
// Shapes conforme docs/mobile-api-contrato.md § grupo 4 (linhas 158-173):
//  · Loja: {id,name,slug,sector,is_published,owner:{...},products_count,created_at}
//  · Usuário: {id,name,email,is_active,is_super_admin,plan:{...},access_expires_at,owned_store:{...}}
//  · Plano: {id,name,slug,is_free,is_active,prices,limits,features,benefits}
import { api, qs } from './client'
import type { ListEnvelope } from '@/composables/useList'

export interface AdminStore {
  id: number
  name: string
  slug: string
  sector?: string | null
  whatsapp?: string | null
  description?: string | null
  accent_color?: string | null
  logo_url?: string | null
  is_published?: boolean
  owner?: {
    id: number
    name: string
    email: string
    plan?: string | null
    access_expires_at?: string | null
  } | null
  products_count?: number
  created_at?: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  is_active?: boolean
  is_super_admin?: boolean
  plan?: { id: number; name: string; slug: string } | null
  access_expires_at?: string | null
  owned_store?: { id: number; name: string; slug: string } | null
  created_at?: string
}

export interface AdminPlan {
  id: number
  name: string
  slug: string
  is_free?: boolean
  is_active?: boolean
  prices?: { monthly?: string | null; semiannual?: string | null; annual?: string | null }
  limits?: {
    max_products?: number | null
    max_categories?: number | null
    max_images_per_product?: number | null
    max_notifications_per_month?: number | null
    max_users?: number | null
  }
  features?: { finance?: boolean; stock?: boolean; delivery_maps?: boolean }
  benefits?: string[]
}

export interface GrantAccessResult extends AdminUser {
  granted?: { plan: string; period: string; expires_at: string }
}

export const adminApi = {
  // GET /admin/stores — ?search? (nome/slug), ?page&per_page → {data, meta}
  stores: (p: { page?: number; per_page?: number; search?: string } = {}) =>
    api.get<ListEnvelope<AdminStore>>('/admin/stores?' + qs(p)),
  store: (id: number | string) => api.get<{ data: AdminStore }>(`/admin/stores/${id}`),
  // PATCH parcial multipart (name/slug/sector/whatsapp/description/accent_color/
  // *_url/logo/is_published). No servidor atual o PHP não parseia multipart em PUT —
  // PATCH é o método do contrato e funciona.
  updateStore: (id: number | string, fd: FormData, onProgress?: (pct: number) => void) =>
    api.patch<{ data: AdminStore }>(`/admin/stores/${id}`, fd, { onProgress }),

  // GET /admin/users — ?search? (nome/e-mail), ?page&per_page → {data, meta}
  users: (p: { page?: number; per_page?: number; search?: string } = {}) =>
    api.get<ListEnvelope<AdminUser>>('/admin/users?' + qs(p)),
  user: (id: number | string) => api.get<{ data: AdminUser }>(`/admin/users/${id}`),
  // PATCH {"is_active": bool} — super-admin: 422; ativar sem acesso futuro: 422
  // (nesse caso o caminho é grant-access).
  setUserActive: (id: number | string, is_active: boolean) =>
    api.patch<{ data: AdminUser }>(`/admin/users/${id}`, { is_active }),
  // POST {"plan_id","period?","custom_days?"} — plano inativo/gratuito ou
  // super-admin: 422. Dispara as mesmas notificações do painel.
  grantAccess: (id: number | string, body: { plan_id: number; period?: string; custom_days?: number }) =>
    api.post<{ data: GrantAccessResult }>(`/admin/users/${id}/grant-access`, body),

  // GET /admin/plans — todos, inclusive inativos
  plans: () => api.get<{ data: AdminPlan[] }>('/admin/plans'),
  createPlan: (body: Record<string, unknown>) => api.post<{ data: AdminPlan }>('/admin/plans', body),
  updatePlan: (id: number | string, body: Record<string, unknown>) =>
    api.patch<{ data: AdminPlan }>(`/admin/plans/${id}`, body),
  // DELETE — `free` ou com usuários/pagamentos: 422
  removePlan: (id: number | string) =>
    api.del<{ data: { removed?: boolean } }>(`/admin/plans/${id}`),
}
