/**
 * Cliente HTTP da API mobile.
 * Contrato: docs/mobile-api-contrato.md do repo Laravel irmão (yzap).
 * Base: VITE_API_URL (https://yzap.com.br/api/mobile/v1).
 * Header obrigatório: Accept: application/json.
 *
 * Semântica de erro (contrato):
 * - 401 → sessão inválida: quem chama deve limpar a sessão (stores/session).
 * - 403 plano/permissão → corpo inclui `plan` + `feature` p/ tela de upgrade.
 * - Escritas de estoque/caixa/financeiro/pedidos exigem `Idempotency-Key`.
 * - Super-admin opera outra loja via header `X-Store-Id`.
 * O token NUNCA é logado; só passa por `tokenGetter` (memória → Keychain).
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

  /** Erros de validação (422) por campo. */
  get fieldErrors(): Record<string, string[]> {
    return this.body.errors ?? {}
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

/** Monta query string ignorando undefined/null/''. */
export function qs(params?: Record<string, unknown>): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    sp.set(key, String(value))
  }
  const out = sp.toString()
  return out ? `?${out}` : ''
}

/** Chave de idempotência (mín. 8 chars exigido pelo contrato). */
export function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* fallback abaixo */
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export interface RequestOptions {
  /** Header Idempotency-Key (escritas de pedidos/estoque/caixa/financeiro). */
  idempotencyKey?: string
  /** Header X-Store-Id (super-admin operando outra loja). */
  storeId?: number | string
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function serialize(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined
  if (isFormData(body)) return body
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  // FormData: o browser monta o multipart (boundary); nunca setar Content-Type.
  if (
    init.body !== undefined &&
    !isFormData(init.body) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  const token = tokenGetter()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey)
  if (opts.storeId !== undefined && opts.storeId !== null && opts.storeId !== '') {
    headers.set('X-Store-Id', String(opts.storeId))
  }

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
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: serialize(body) }, opts),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body: serialize(body) }, opts),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: serialize(body) }, opts),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE' }, opts),
  /** multipart/form-data (upload de logo/cover/produto/recebível). */
  upload: <T>(path: string, form: FormData, method: 'POST' | 'PUT' | 'PATCH' = 'PUT', opts?: RequestOptions) =>
    request<T>(path, { method, body: form }, opts),
}
