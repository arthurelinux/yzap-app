import { watch } from 'vue'
import { useShopStore } from '@/stores/shop'

/**
 * Tema global da loja (fonte única do `accent_color`).
 *
 * - A API devolve `accent_color` em GET /store (contrato § grupo 2, mesma
 *   regra do painel web: `#rrggbb` estrito, fallback `#087f6f`).
 * - Este composable observa `shop.accentColor` e aplica no
 *   `document.documentElement`: `--yz-accent` + `--ion-color-primary`
 *   COMPLETO (`-rgb` derivado do hex, `-contrast #ffffff`, `-shade`
 *   escurecido ~12%, `-tint` clareado ~12%) — o Ionic exige as variantes
 *   para botões, badges, abas e estados.
 * - Chamado uma vez no `App.vue` (não só no dashboard): reage a cada troca
 *   de loja/cor, inclusive após salvar nova cor em Configurações
 *   (`shop.applyStore()` muda o computed e o watcher reaplica sem reload).
 * - Texto sobre primary usa sempre `-contrast` (#ffffff): legível no
 *   light e no dark para cores de marca saturadas (regra do painel).
 * - Texto NA cor de destaque sobre superfícies usa `--yz-accent-ink`
 *   (igual ao accent no claro; clareado no escuro — ver tokens.css).
 */
export const STORE_ACCENT_FALLBACK = '#087f6f'

/** Mesma validação do painel: `#rrggbb` estrito. */
export const STORE_ACCENT_RE = /^#[0-9A-Fa-f]{6}$/

/** Valida; qualquer valor inesperado cai no fallback (regra do painel). */
export function normalizeAccent(raw: unknown): string {
  if (typeof raw === 'string') {
    const value = raw.trim()
    if (STORE_ACCENT_RE.test(value)) return value
  }
  return STORE_ACCENT_FALLBACK
}

function hexToRgb(hex: string): [number, number, number] {
  const num = (i: number): number => parseInt(hex.slice(i, i + 2), 16)
  return [num(1), num(3), num(5)]
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number): string =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`
}

/** Escurece ~12% (shade do Ionic). */
export function shadeHex(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return toHex(r * 0.88, g * 0.88, b * 0.88)
}

/** Clareia ~12% em direção ao branco (tint do Ionic). */
export function tintHex(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return toHex(r + (255 - r) * 0.12, g + (255 - g) * 0.12, b + (255 - b) * 0.12)
}

/** Aplica a cor no `<html>`; devolve o hex efetivo (após fallback). */
export function applyStoreAccent(raw: unknown): string {
  const hex = normalizeAccent(raw)
  const [r, g, b] = hexToRgb(hex)
  const root = document.documentElement
  root.style.setProperty('--yz-accent', hex)
  root.style.setProperty('--ion-color-primary', hex)
  root.style.setProperty('--ion-color-primary-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--ion-color-primary-contrast', '#ffffff')
  root.style.setProperty('--ion-color-primary-contrast-rgb', '255, 255, 255')
  root.style.setProperty('--ion-color-primary-shade', shadeHex(hex))
  root.style.setProperty('--ion-color-primary-tint', tintHex(hex))
  return hex
}

/**
 * Ativa o tema global da loja. Chamar uma vez no `App.vue` (setup):
 * o watcher com `immediate: true` aplica na inicialização e reaplica
 * a cada troca de loja/cor.
 */
export function useStoreTheme(): void {
  const shop = useShopStore()
  watch(
    () => shop.accentColor,
    (color) => {
      applyStoreAccent(color)
    },
    { immediate: true },
  )
}
