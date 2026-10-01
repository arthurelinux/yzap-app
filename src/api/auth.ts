import { api } from './client'

/** Grupo 1 — Auth/sessão ✅ Documentado (contrato § Grupo 1). */

export interface SessionAccount {
  active: boolean
  paid_features_active: boolean
  plan: string | null
  access_expires_at: string | null
  renewal_url: string | null
  message: string | null
}

export interface SessionUser {
  id: number
  name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  is_super_admin: boolean
}

export interface SessionEnvelope {
  token_type: 'Bearer'
  access_token: string
  abilities: string[]
  user: SessionUser
  account: SessionAccount
}

export interface MeResponse {
  data: { user: SessionUser; account: SessionAccount }
}

export interface AccountStatusResponse {
  data: SessionAccount
}

function devicePayload() {
  const raw = typeof navigator !== 'undefined' ? navigator.userAgent : 'web'
  // Tokens de device nomeados "<platform> · <device_name>" (máx. 50 chars).
  const device_name = `web · ${raw}`.slice(0, 50)
  return { device_name, platform: 'web' as const }
}

export const authApi = {
  login(email: string, password: string) {
    return api.post<{ data: SessionEnvelope }>('/auth/login', {
      email,
      password,
      ...devicePayload(),
    })
  },
  /** id_token do Google Sign-In — verificado SÓ no servidor. O app nunca valida localmente. */
  loginWithGoogle(id_token: string) {
    return api.post<{ data: SessionEnvelope }>('/auth/google', {
      id_token,
      ...devicePayload(),
    })
  },
  me() {
    return api.get<MeResponse>('/me')
  },
  accountStatus() {
    return api.get<AccountStatusResponse>('/account/status')
  },
  refresh() {
    return api.post<{ data: SessionEnvelope }>('/auth/refresh', devicePayload())
  },
  logout() {
    return api.post<{ data: { revoked: boolean } }>('/auth/logout')
  },
  logoutAll() {
    return api.post<{ data: { revoked: number } }>('/auth/logout-all')
  },
  changePassword(current_password: string, password: string, password_confirmation: string) {
    return api.post<{ data: { updated: boolean; revoked_others: boolean } }>('/auth/password', {
      current_password,
      password,
      password_confirmation,
    })
  },
}
