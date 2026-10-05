<template>
  <!-- Shell fiel ao gabarito `preview/ionic.blade.php` (repo Laravel irmão):
       ion-split-pane com menu de 232px no desktop (quando ≥ lg), drawer no
       mobile, itens numa linha (nowrap/ellipsis), seções MINHA LOJA/CONTA/
       ADMIN e tab-bar mobile. Itens sem permissão SOME (igual ao painel);
       nenhum item é "em breve" — todos são features reais da API. -->
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <ion-menu content-id="main-content" v-if="session.isAuthenticated">
        <div class="yz-logo"><img src="@/assets/horizontal.png" alt="YZap" /></div>
        <ion-content>
          <template v-for="sec in sections" :key="sec.title">
            <template v-if="sec.items.length">
              <div class="menu-sec">{{ sec.title }}</div>
              <div
                v-for="item in sec.items"
                :key="item.label"
                class="menu-item"
                :class="{ active: isActive(item) }"
                @click="go(item)"
              >
                <ion-icon :name="item.icon"></ion-icon>
                <span class="menu-label">{{ item.label }}</span>
              </div>
            </template>
          </template>
        </ion-content>
      </ion-menu>

      <div class="ion-page" id="main-content">
        <ion-router-outlet></ion-router-outlet>
        <ion-tab-bar
          slot="bottom"
          class="mobile-tabs"
          color="light"
          v-if="session.isAuthenticated"
        >
          <ion-tab-button
            v-for="tab in tabs"
            :key="tab.path"
            :tab="tab.label"
            :selected="route.path === tab.path || route.path.startsWith(`${tab.path}/`)"
            @click="goTab(tab.path)"
          >
            <ion-icon :name="tab.icon"></ion-icon>
            <ion-label>{{ tab.label }}</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="mais" :selected="false" @click="openMenu">
            <ion-icon name="menu-outline"></ion-icon>
            <ion-label>Mais</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </div>
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonApp,
  IonContent,
  IonIcon,
  IonMenu,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  menuController,
} from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import { useSessionStore } from '@/stores/session'
import { useShopStore } from '@/stores/shop'
import { useStoreTheme } from '@/composables/useStoreTheme'

interface MenuEntry {
  label: string
  icon: string
  path?: string
  action?: 'open-store'
}
interface MenuSection {
  title: string
  items: MenuEntry[]
}

const session = useSessionStore()
const shop = useShopStore()

/** Tema global da loja (accent_color reativo em todo o app — fonte única). */
useStoreTheme()

const router = useRouter()
const route = useRoute()

/** Permissões vindas do GET /store (contrato § grupo 2). */
const perms = computed(() => new Set(shop.store?.permissions ?? []))
function can(permission: string): boolean {
  return perms.value.has(permission)
}

const sections = computed<MenuSection[]>(() => {
  const loja: MenuEntry[] = [{ label: 'Visão geral', icon: 'home-outline', path: '/inicio' }]
  // Configurações exige permissão `store_theme` (igual ao painel).
  if (can('store_theme')) {
    loja.push({ label: 'Configurar loja', icon: 'storefront-outline', path: '/configurar-loja' })
  }
  if (can('products')) {
    loja.push({ label: 'Categorias', icon: 'grid-outline', path: '/categorias' })
    loja.push({ label: 'Produtos', icon: 'cube-outline', path: '/produtos' })
  }
  if (can('orders')) loja.push({ label: 'Pedidos', icon: 'receipt-outline', path: '/pedidos' })
  if (can('customers')) loja.push({ label: 'Clientes', icon: 'people-outline', path: '/clientes' })
  if (can('finance')) {
    loja.push({ label: 'Financeiro', icon: 'wallet-outline', path: '/financeiro' })
    loja.push({ label: 'Caixa', icon: 'lock-closed-outline', path: '/caixa' })
  }
  if (can('stock')) loja.push({ label: 'Estoque', icon: 'layers-outline', path: '/estoque' })
  if (shop.store?.public_url) {
    loja.push({ label: 'Abrir minha loja', icon: 'open-outline', action: 'open-store' })
  }

  const conta: MenuEntry[] = [
    { label: 'Assinatura', icon: 'card-outline', path: '/assinatura' },
    // Afiliados (grupo 11): só auth, sem permissão de loja — sempre visível.
    { label: 'Indicar e ganhar', icon: 'gift-outline', path: '/afiliados' },
  ]
  // Equipe: só o titular gerencia (mesma regra do painel; contrato § grupo 2).
  if (shop.store?.is_owner) {
    conta.push({ label: 'Usuários', icon: 'person-add-outline', path: '/equipe' })
  }

  const admin: MenuEntry[] = session.isAdmin
    ? [
        { label: 'Lojas', icon: 'storefront-outline', path: '/admin/lojas' },
        { label: 'Usuários', icon: 'people-outline', path: '/admin/usuarios' },
        { label: 'Planos', icon: 'diamond-outline', path: '/admin/planos' },
      ]
    : []

  const out: MenuSection[] = [
    { title: 'MINHA LOJA', items: loja },
    { title: 'CONTA', items: conta },
  ]
  if (admin.length) out.push({ title: 'ADMIN', items: admin })
  return out
})

/** Tabs de nível 1 (mesma ordem do spike): Início, Pedidos, Produtos, Mais. */
const tabs = computed(() => {
  const list = [{ label: 'Início', icon: 'home-outline', path: '/inicio' }]
  if (can('orders')) list.push({ label: 'Pedidos', icon: 'receipt-outline', path: '/pedidos' })
  if (can('products')) list.push({ label: 'Produtos', icon: 'cube-outline', path: '/produtos' })
  return list
})

function isActive(item: MenuEntry): boolean {
  if (!item.path) return false
  if (item.path === '/inicio') return route.path === '/inicio' || route.path === '/'
  return route.path === item.path || route.path.startsWith(`${item.path}/`)
}

async function go(item: MenuEntry) {
  if (item.action === 'open-store') {
    const url = shop.store?.public_url
    if (url) await Browser.open({ url })
    return
  }
  if (item.path) await router.push(item.path)
}

async function goTab(path: string) {
  if (route.path !== path) await router.push(path)
}

async function openMenu() {
  await menuController.open()
}

onMounted(() => {
  // Garante permissões do menu mesmo com deep-link sem passar pelo dashboard.
  if (session.isAuthenticated && !shop.store) {
    void shop.load().catch(() => undefined)
  }
})
</script>
