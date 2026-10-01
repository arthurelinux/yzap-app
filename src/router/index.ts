import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/inicio' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
  },
  {
    path: '/inicio',
    name: 'inicio',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  // 403 de PLANO (com plan+feature) × 403 de PERMISSÃO: telas distintas com CTA.
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
  // Conta inativa (GET /me com account.active=false + renewal_url).
  {
    path: '/renovar',
    name: 'renovar',
    component: () => import('@/pages/RenewPage.vue'),
    meta: { requiresAuth: true },
  },
  // Placeholder honesto: grupos 3–6 ainda sem telas (escopo fechado da fase 1).
  {
    path: '/em-breve',
    name: 'em-breve',
    component: () => import('@/pages/ComingSoonPage.vue'),
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
  return true
})

export default router
