import { ref } from 'vue'

/**
 * Tema claro/escuro persistido.
 * - Escuro: classe `ion-palette-dark` no <html> + `@ionic/vue/css/palettes/dark.class.css`
 *   (importado no main.ts), com overrides no theme/app.css fiéis ao gabarito.
 * - Preferência salva em localStorage (`yz-theme`); sem escolha explícita,
 *   segue o sistema (matchMedia).
 */
export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'yz-theme'

const mode = ref<ThemeMode>('light')

function systemDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(next: ThemeMode, persist: boolean) {
  mode.value = next
  document.documentElement.classList.toggle('ion-palette-dark', next === 'dark')
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* modo privado / storage indisponível */
    }
  }
}

/** Chamado no boot (main.ts): restaura preferência salva ou usa o sistema. */
export function initTheme(): void {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* sem storage */
  }
  const next: ThemeMode =
    saved === 'dark' || saved === 'light' ? saved : systemDark() ? 'dark' : 'light'
  apply(next, false)
}

/** Toggle explícito (topbar/popover do perfil) → persiste. */
export function toggleTheme(): ThemeMode {
  const next: ThemeMode = mode.value === 'dark' ? 'light' : 'dark'
  apply(next, true)
  return next
}

export function useTheme() {
  return { mode, toggle: toggleTheme }
}
