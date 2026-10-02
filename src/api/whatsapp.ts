import { api } from './client'

/**
 * Grupo 10 — WhatsApp/Evolution ✅ Documentado (contrato § Grupo 10).
 * Auth + `active` + permissão `notifications` em todas. Leitura SEM plano
 * (espelha a página de conexão do painel); sync COM plano pago (espelha o
 * `paid_plan` do `syncQrApi`).
 *
 * SEGREDO: tokens da Evolution NUNCA saem do servidor — a resposta traz só
 * status + QR. O app nunca exibe nem armazena token.
 */

export interface WhatsappStatus {
  instance_name: string
  status: string
  connected: boolean
  connected_at: string | null
  has_qr: boolean
  /** data URI ou null (quando conectado). */
  qr_code: string | null
}

export const whatsappApi = {
  /** Sem instância: 404 (o painel mostra o form de criação). */
  show() {
    return api.get<{ data: WhatsappStatus }>('/whatsapp')
  },

  /**
   * `instance_name` obrigatório só na 1ª conexão (letras/números/`_`/`-`,
   * 3–60 chars, como o `CreateInstanceRequest`). Falha na Evolution: 503.
   */
  async syncQr(instanceName?: string): Promise<WhatsappStatus & { message?: string }> {
    const { data } = await api.post<{ data: WhatsappStatus & { message?: string } }>(
      '/whatsapp/sync-qr',
      instanceName ? { instance_name: instanceName } : {},
    )
    return data
  },
}

/** Rótulo PT do status, igual ao painel (`connection` view). */
export function whatsappStatusLabel(status: string | null | undefined): string {
  if (status === 'connected') return 'Conectado'
  if (status === 'connecting') return 'Conectando'
  if (status === 'disconnected') return 'Desconectado'
  return status || '—'
}
