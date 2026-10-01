import { ApiError } from '@/api/client'
import type { Router } from 'vue-router'

/** Mensagem amigável de qualquer erro de API (validação 422 primeiro). */
export function apiMessage(e: unknown, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (e instanceof ApiError) {
    if (e.status === 422 && e.body.errors) {
      const firstList = Object.values(e.body.errors)
      const first = firstList[0]?.[0]
      if (first) return first
    }
    return e.message
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}

/** Erros de validação (422) por campo, para marcar inputs. */
export function fieldErrors(e: unknown): Record<string, string[]> {
  return e instanceof ApiError ? e.fieldErrors : {}
}

/**
 * Roteia erros de sessão/permissão/plano do contrato:
 * 401 → login · 403 com plan/feature → tela de upgrade (distinta) ·
 * 403 sem plan/feature → tela de permissão (distinta).
 * Retorna true quando já foi tratado (não mostrar como erro inline).
 */
export async function routeApiError(e: unknown, router: Router): Promise<boolean> {
  if (!(e instanceof ApiError)) return false
  if (e.status === 401) {
    await router.replace({ name: 'login' })
    return true
  }
  if (e.status === 403) {
    if (e.isPlanBlock) {
      await router.replace({
        name: 'plano-bloqueado',
        query: { plan: e.body.plan ?? '', feature: e.body.feature ?? '' },
      })
    } else {
      await router.replace({ name: 'sem-permissao' })
    }
    return true
  }
  return false
}
