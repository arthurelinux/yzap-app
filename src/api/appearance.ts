import { api } from './client'

/**
 * Grupo 8 — Aparência ✅ Documentado (contrato § Grupo 8).
 * Auth + `active` + permissão `store_theme` em todas — SEM plano pago, como o
 * painel (rotas fora do `paid_plan`). Abas Temas/Banners/Capa do painel.
 *
 * NOTA DE TRANSPORTE: `PUT /appearance/custom` e `PUT /appearance/cover` são
 * `multipart/form-data` no contrato. Como em `PUT /store/settings`, o PHP pode
 * não parsear multipart em PUT (ver pendência no STATUS.md) — por isso cada
 * tela de envio confere a resposta (flags/URL) e avisa quando nada mudou.
 */

export interface ThemeMeta {
  name: string
  description: string
  badge: string
}

export interface ThemeInfo {
  theme: string
  is_food: boolean
  themes: Record<string, ThemeMeta>
  has_custom: boolean
}

export interface CustomThemeInfo {
  has_html: boolean
  has_css: boolean
  html_size: number
  css_size: number
  custom_theme_html: string | null
  custom_theme_css: string | null
}

export interface Banner {
  id: number
  title: string | null
  link_url: string | null
  image_url: string | null
  position: number
  is_active: boolean
}

export interface BannersIndex {
  data: Banner[]
  meta: { total: number; show_hero: boolean }
}

export interface BannerPayload {
  title?: string | null
  link_url?: string | null
  /** ATENÇÃO: o backend aplica `$request->boolean('is_active')` em TODO PUT —
   * ausente vira `false`. Envie SEMPRE o valor atual ao editar. */
  is_active?: boolean
}

export const appearanceApi = {
  // ---------- Tema da vitrine (aba Temas do painel) ----------
  theme() {
    return api.get<{ data: ThemeInfo }>('/appearance/theme')
  },

  /** `food` fora do segmento food: 422 (mesma regra do painel). */
  async updateTheme(theme: string): Promise<ThemeInfo> {
    const { data } = await api.put<{ data: ThemeInfo }>('/appearance/theme', { theme })
    return data
  },

  // ---------- Tema personalizado (mesma validação do painel) ----------
  custom() {
    return api.get<{ data: CustomThemeInfo }>('/appearance/custom')
  },

  /**
   * HTML (.html/.htm 256 KB) e CSS (.css 256 KB); scripts/eventos/`@import`:
   * 422. Sanitização final no servidor (`CustomThemeService`).
   */
  async updateCustom(
    files: { html?: File | null; css?: File | null },
    onProgress?: (pct: number) => void,
  ): Promise<CustomThemeInfo> {
    const form = new FormData()
    if (files.html) form.append('custom_theme_html', files.html)
    if (files.css) form.append('custom_theme_css', files.css)
    const { data } = await api.upload<{ data: CustomThemeInfo }>('/appearance/custom', form, 'PUT', {
      onProgress,
    })
    return data
  },

  // ---------- Banners + hero (aba Banners do painel) ----------
  banners() {
    return api.get<BannersIndex>('/appearance/banners')
  },

  /** POST multipart: `image` obrigatória (5 MB), `title?` (120), `link_url?`. */
  createBanner(fd: FormData, onProgress?: (pct: number) => void) {
    return api.upload<{ data: Banner }>('/appearance/banners', fd, 'POST', { onProgress })
  },

  /** Registrar ANTES de `/appearance/banners/{banner}` (mesma ordem do painel). */
  async updateHero(show_hero: boolean): Promise<boolean> {
    const { data } = await api.put<{ data: { show_hero: boolean } }>(
      '/appearance/banners/hero',
      { show_hero },
    )
    return data.show_hero
  },

  async updateBanner(id: number | string, body: BannerPayload): Promise<Banner> {
    const { data } = await api.put<{ data: Banner }>(`/appearance/banners/${id}`, body)
    return data
  },

  removeBanner(id: number | string) {
    return api.del<{ data: { removed: boolean } }>(`/appearance/banners/${id}`)
  },

  // ---------- Capa (aba Capa do painel; S3 `catalog/covers/{user_id}`) ----------
  cover() {
    return api.get<{ data: { cover_image_url: string | null } }>('/appearance/cover')
  },

  async updateCover(file: File, onProgress?: (pct: number) => void): Promise<string | null> {
    const form = new FormData()
    form.append('cover_image', file)
    const { data } = await api.upload<{ data: { cover_image_url: string | null } }>(
      '/appearance/cover',
      form,
      'PUT',
      { onProgress },
    )
    return data.cover_image_url
  },
}
