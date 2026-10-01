// Grupo 6 — Pedidos (contrato § Grupo 6, linhas 217-225).
// Escritas de status/itens exigem header `Idempotency-Key` (mín. 8 chars).
import { api, qs, newIdempotencyKey, type RequestOptions } from './client'
import type { ListEnvelope } from '@/composables/useList'

/** Os 7 status de `CatalogOrder::STATUSES`, na ordem do painel. */
export const ORDER_STATUSES = [
  'received',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export interface OrderCustomer {
  id?: number
  name: string
  phone?: string | null
  address?: string | null
}

export interface OrderItem {
  id?: number
  product_id?: number
  variant_id?: number | null
  name?: string
  product_name?: string
  variant_name?: string | null
  quantity: number
  unit_price?: number
  price?: number
  subtotal?: number
  total?: number
  options?: unknown[]
}

export interface Order {
  id: number
  number: string
  status: OrderStatus
  status_label?: string
  fulfillment_type?: string
  customer?: OrderCustomer
  items?: OrderItem[]
  total?: number
  delivery_fee?: number | null
  payment_method?: string | null
  payment_status?: string | null
  paid_at?: string | null
  notification?: 'sent' | 'failed' | 'not_sent' | null
  notification_error?: string | null
  created_at?: string
}

export interface OrderNotification {
  id: number
  number: string
  customer_name?: string
  total?: number
  created_at?: string
}

export const ordersApi = {
  /** GET /orders — ?scope=open|completed|cancelled|all, ?status?, ?search?, ?page&per_page */
  list(params: {
    scope?: 'open' | 'completed' | 'cancelled' | 'all'
    status?: string
    search?: string
    page?: number
    per_page?: number
  }) {
    return api.get<ListEnvelope<Order>>(`/orders${qs(params)}`)
  },

  /** GET /orders/notifications?after_id= — payload do painel (polling do app). */
  notifications(afterId = 0) {
    return api.get<{ latest_id: number; orders: OrderNotification[]; recent: OrderNotification[] }>(
      `/orders/notifications${qs({ after_id: afterId })}`,
    )
  },

  get(id: number | string) {
    return api.get<{ data: Order }>(`/orders/${id}`)
  },

  /** PATCH /orders/{order}/status — baixa estoque/estorno/notificação no servidor. */
  setStatus(id: number | string, status: OrderStatus, opts?: RequestOptions) {
    return api.patch<{ data: Order & { notification?: string } }>(
      `/orders/${id}/status`,
      { status },
      { idempotencyKey: opts?.idempotencyKey ?? newIdempotencyKey() },
    )
  },

  /** PATCH /orders/{order}/items — mesmo cálculo/reserva do painel. */
  updateItems(
    id: number | string,
    items: Array<{ product_id: number; variant_id?: number | null; quantity: number }>,
    opts?: RequestOptions,
  ) {
    return api.patch<{ data: Order }>(
      `/orders/${id}/items`,
      { items },
      { idempotencyKey: opts?.idempotencyKey ?? newIdempotencyKey() },
    )
  },
}
