import { api } from './client'

/**
 * Grupo 9 — Notificações da loja ✅ Documentado (contrato § Grupo 9).
 * Auth + `active` + plano pago + permissão `notifications` em todas (mesma
 * exigência do painel: `paid_plan` + `store.permission:notifications`).
 * NÃO colide com `GET /orders/notifications` (polling de pedidos).
 *
 * No app, esta config vive dentro da aba WhatsApp ("Mensagens automáticas"),
 * pois são as mensagens enviadas pelo WhatsApp a cada status do pedido.
 */

export interface NotificationsConfig {
  /** status → texto (mesclado aos padrões do `CatalogNotificationService`). */
  messages: Record<string, string>
  enabled_statuses: string[]
  /** status → rótulo (mesmas chaves de `CatalogOrder::STATUSES`). */
  statuses: Record<string, string>
  tags: string[]
  whatsapp: { connected: boolean; status: string | null }
}

export const notificationsApi = {
  show() {
    return api.get<{ data: NotificationsConfig }>('/notifications')
  },

  /**
   * `messages` OBRIGATÓRIO (objeto completo; valores ≤5000 chars),
   * `statuses?` (só chaves válidas, senão 422). Ausente em `statuses` = vazio.
   */
  async update(body: { messages: Record<string, string>; statuses: string[] }): Promise<NotificationsConfig> {
    const { data } = await api.put<{ data: NotificationsConfig }>('/notifications', body)
    return data
  },
}
