import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@/stores/session'

/**
 * Rotas do app (espelham as seções do painel). Cada rota é uma feature REAL
 * ligada à API mobile (contrato docs/mobile-api-contrato.md, grupos 1–6 ✅).
 * Guards: `requiresAuth` (sessão), `admin` (ability `mobile:admin`).
 *
 * Os blocos por grupo são habilitados junto com o commit da feature
 * correspondente (nada de "em breve": sem tela, a rota simplesmente não existe).
 */
const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/inicio' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
  },

  /* ---------- Grupo 1 — sessão ---------- */
  {
    path: '/inicio',
    name: 'inicio',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  // Conta inativa (GET /me com account.active=false + renewal_url).
  {
    path: '/renovar',
    name: 'renovar',
    component: () => import('@/pages/RenewPage.vue'),
    meta: { requiresAuth: true },
  },

  /* ---------- 403: plano × permissão (telas distintas com CTA) ---------- */
  {
    path: '/plano-bloqueado',
    name: 'plano-bloqueado',
    component: () => import('@/pages/PlanBlockedPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/sem-permissao',
    name: 'sem-permissao',
    component: () => import('@/pages/ForbiddenPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const session = useSessionStore()
  if (!session.hydrated) await session.hydrate()
  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.name === 'login' && session.isAuthenticated) {
    return { name: 'inicio' }
  }
  // Grupo 4: somente ability `mobile:admin` (contrato § admin).
  if (to.meta.admin && !session.isAdmin) {
    return { name: 'sem-permissao' }
  }
  return true
})

export default router
