// Cores dos 7 status de `CatalogOrder::STATUSES` (ordem do painel).
// `preparing`/`ready` NÃO usam `secondary`/`tertiary` do Ionic: roxo/índigo
// sólido com texto branco falha contraste no dark (e o `secondary` claro
// falha até no light). Usam badges suaves próprios (`.yz-status-*` em
// `theme/app.css`, AA nos dois temas) via `statusClass()`; `statusColor()`
// volta `''` nesses dois casos. Demais status seguem cores Ionic (fundo
// sólido + texto de contraste, AA nos dois temas).
export function statusColor(status?: string): string {
  switch (status) {
    case 'received':
      return 'warning'
    case 'confirmed':
      return 'primary'
    case 'out_for_delivery':
      return 'success'
    case 'completed':
      return 'medium'
    case 'cancelled':
      return 'danger'
    case 'preparing':
    case 'ready':
      // Cor vem de `statusClass()` (badge suave com AA nos dois temas).
      return ''
    default:
      return 'medium'
  }
}

/** Classe do badge suave (só `preparing`/`ready` têm; demais usam `color`). */
export function statusClass(status?: string): string {
  if (status === 'preparing') return 'yz-status-preparing'
  if (status === 'ready') return 'yz-status-ready'
  return ''
}
