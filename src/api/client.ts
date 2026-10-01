/**
 * Cliente HTTP da API mobile.
 * Contrato: docs/mobile-api-contrato.md do repo Laravel irmão (yzap).
 * Base: VITE_API_URL (https://yzap.com.br/api/mobile/v1).
 * Header obrigatório: Accept: application/json.
 *
 * Semântica de erro (contrato):
 * - 401 → sessão inválida: quem chama deve limpar a sessão (stores/session).
 * - 403 plano/permissão → corpo inclui `plan` + `feature` p/ tela de upgrade.
 * - Escritas de estoque/caixa/financeiro exigem `Idempotency-Key` (grupos futuros).
 */

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  plan?: string | null
  feature?: string | null
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody
  /** true quando o 403 é bloqueio de PLANO; false quando é falta de PERMISSÃO. */
  isPlanBlock: boolean

  constructor(status: number, body: ApiErrorBody) {
    super(body?.message || `Erro ${status}`)
    this.status = status
    this.body = body
    // O contrato garante `plan`+`feature` no 403 de plano.
    this.isPlanBlock = status === 403 && Boolean(body?.plan || body?.feature)
  }
}

let tokenGetter: () => string | null = () => null
let onUnauthorized: () => void = () => {}

export function configureApi(opts: {
  getToken: () => string | null
  onUnauthorized: () => void
}) {
  tokenGetter = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

if (!BASE && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn('[api] VITE_API_URL não definido')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = tokenGetter()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    onUnauthorized()
    let body: ApiErrorBody = {}
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      /* corpo vazio */
    }
    throw new ApiError(401, body)
  }

  if (!res.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      /* corpo vazio */
    }
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: extraHeaders,
    }),
}
