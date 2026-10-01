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
  /* ---------- Grupo 2 — loja (configurações + equipe) ---------- */
  {
    path: '/configurar-loja',
    name: 'configurar-loja',
    component: () => import('@/pages/StoreSettingsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/equipe',
    name: 'equipe',
    component: () => import('@/pages/TeamPage.vue'),
    meta: { requiresAuth: true },
  },
  /* ---------- Grupo 3 — clientes ---------- */
  {
    path: '/clientes',
    name: 'clientes',
    component: () => import('@/pages/CustomersPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clientes/novo',
    name: 'cliente-novo',
    component: () => import('@/pages/CustomerFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clientes/:id/editar',
    name: 'cliente-editar',
    component: () => import('@/pages/CustomerFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/clientes/:id',
    name: 'cliente-detalhe',
    component: () => import('@/pages/CustomerDetailPage.vue'),
    meta: { requiresAuth: true },
  },
  /* ---------- Grupo 4 — admin (somente ability `mobile:admin`) ---------- */
  {
    path: '/admin/lojas',
    name: 'admin-lojas',
    component: () => import('@/pages/AdminStoresPage.vue'),
    meta: { requiresAuth: true, admin: true },
  },
  {
    path: '/admin/lojas/:id',
    name: 'admin-loja',
    component: () => import('@/pages/AdminStoreDetailPage.vue'),
    meta: { requiresAuth: true, admin: true },
  },
  {
    path: '/admin/usuarios',
    name: 'admin-usuarios',
    component: () => import('@/pages/AdminUsersPage.vue'),
    meta: { requiresAuth: true, admin: true },
  },
  {
    path: '/admin/usuarios/:id',
    name: 'admin-usuario',
    component: () => import('@/pages/AdminUserDetailPage.vue'),
    meta: { requiresAuth: true, admin: true },
  },
  {
    path: '/admin/planos',
    name: 'admin-planos',
    component: () => import('@/pages/AdminPlansPage.vue'),
    meta: { requiresAuth: true, admin: true },
  },
  /* ---------- Grupo 6 — operacional (pedidos/produtos/estoque/financeiro) ---------- */
  {
    path: '/pedidos',
    name: 'pedidos',
    component: () => import('@/pages/OrdersPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/pedidos/:id',
    name: 'pedido-detalhe',
    component: () => import('@/pages/OrderDetailPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/categorias',
    name: 'categorias',
    component: () => import('@/pages/CategoriesPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/produtos',
    name: 'produtos',
    component: () => import('@/pages/ProductsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/produtos/novo',
    name: 'produto-novo',
    component: () => import('@/pages/ProductFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/produtos/:id/editar',
    name: 'produto-editar',
    component: () => import('@/pages/ProductFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/produtos/:id',
    name: 'produto-detalhe',
    component: () => import('@/pages/ProductDetailPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/estoque',
    name: 'estoque',
    component: () => import('@/pages/StockPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/estoque/ajuste/:id',
    name: 'estoque-ajuste',
    component: () => import('@/pages/StockAdjustPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/financeiro',
    name: 'financeiro',
    component: () => import('@/pages/FinancePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/financeiro/despesas/nova',
    name: 'expense-nova',
    component: () => import('@/pages/ExpenseFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/financeiro/despesas/:id',
    name: 'expense-editar',
    component: () => import('@/pages/ExpenseFormPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/caixa',
    name: 'caixa',
    component: () => import('@/pages/CashPage.vue'),
    meta: { requiresAuth: true },
  },
  /* ---------- Grupo 5 — billing (checkout MP é browser externo) ---------- */
  {
    path: '/assinatura',
    name: 'assinatura',
    component: () => import('@/pages/SubscriptionPage.vue'),
    meta: { requiresAuth: true },
  },
  // Retorno do browser externo (deeplink/universal link): SÓ navega — o status
  // real vem de GET /billing/status/{payment} e a ativação é do webhook.
  { path: '/billing/return', redirect: '/assinatura' },
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
