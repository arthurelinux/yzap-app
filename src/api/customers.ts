import { api, qs } from './client'

/** Grupo 3 — Clientes ✅ Documentado (contrato § Grupo 3). */

export interface Customer {
  id: number
  name: string
  phone: string
  address: string | null
  postal_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  orders_count: number
  total_spent: number
  first_order_at: string | null
  last_order_at: string | null
  created_at: string
}

export interface CustomerDetail extends Customer {
  stats: {
    orders_count: number
    total_spent: number
    average_ticket: number
  }
  recent_orders: Array<{
    id: number
    number: string
    status: string
    total: number
    created_at: string
  }>
}

export interface CustomerPayload {
  name: string
  phone: string
  postal_code?: string | null
  address?: string | null
  address_number?: string | null
  address_complement?: string | null
  neighborhood?: string | null
  city_name?: string | null
  state_code?: string | null
}

export const customersApi = {
  list(params: { search?: string; page?: number; per_page?: number }) {
    return api.get<{
      data: Customer[]
      meta: { current_page: number; per_page: number; total: number; last_page?: number }
    }>(`/customers${qs(params)}`)
  },

  /** Lookup por telefone (qualquer formato; normalizado no servidor). 404 se não existe. */
  lookup(phone: string) {
    return api.get<{ data: Customer }>(`/customers/lookup${qs({ phone })}`)
  },

  get(id: number | string) {
    return api.get<{ data: CustomerDetail }>(`/customers/${id}`)
  },

  create(payload: CustomerPayload) {
    return api.post<{ data: Customer }>('/customers', payload)
  },

  update(id: number | string, payload: CustomerPayload) {
    return api.put<{ data: Customer }>(`/customers/${id}`, payload)
  },

  remove(id: number | string) {
    return api.del<{ data: { removed: boolean } }>(`/customers/${id}`)
  },
}
