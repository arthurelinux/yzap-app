<template>
  <ion-page>
    <!-- Topbar do spike: sem título no toolbar (o título fica no conteúdo). -->
    <AppBar>
      <template #extra>
        <ion-button v-if="canOrders" id="notif-btn" title="Pedidos recentes">
          <ion-icon name="notifications-outline"></ion-icon>
        </ion-button>
        <ion-button id="share-btn" title="Indicar e ganhar" @click="goAffiliates">
          <ion-icon name="share-social-outline"></ion-icon>
        </ion-button>
      </template>
    </AppBar>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card v-if="shop.stale" color="warning" class="stale-card">
        <ion-card-content>
          <ion-icon name="cloud-offline-outline"></ion-icon>
          Sem conexão — dados em cache
          <span v-if="shop.cachedAt"> ({{ cachedLabel }})</span>. Podem estar desatualizados.
        </ion-card-content>
      </ion-card>

      <PageHead title="Minha loja" sub="Visão geral" />

      <div v-if="shop.busy && !shop.store" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando sua loja…</p>
      </div>

      <ion-text v-else-if="shop.lastError && !shop.store" color="danger">
        <div class="yz-state">
          <ion-icon name="cloud-offline-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ shop.lastError }}</p>
          <ion-button fill="outline" @click="reload">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else-if="shop.store">
        <!-- Cards de status (spike: Categorias / Produtos / Publicação). -->
        <div class="stat-grid">
          <ion-card v-for="card in statCards" :key="card.label" class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">{{ card.label }}</p>
                <p class="stat-num" :class="{ small: card.small }">{{ card.value }}</p>
              </div>
              <div class="icon-chip" :class="card.chip">
                <ion-icon :name="card.icon"></ion-icon>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <div class="main-grid">
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>Endereço da loja</h2>
              <div class="url-row">
                <ion-input readonly :value="shop.store.public_url ?? ''"></ion-input>
                <ion-button class="btn-copy" fill="outline" @click="copyLink">Copiar</ion-button>
                <ion-button class="btn-open" @click="openStore">Abrir</ion-button>
              </div>
              <div class="actions-row">
                <ion-button
                  v-if="can('products')"
                  fill="outline"
                  color="primary"
                  router-link="/categorias"
                >
                  <ion-icon slot="start" name="grid-outline"></ion-icon>Gerenciar categorias
                </ion-button>
                <ion-button
                  v-if="can('products')"
                  fill="outline"
                  color="success"
                  router-link="/produtos/novo"
                >
                  <ion-icon slot="start" name="cube-outline"></ion-icon>Cadastrar produto
                </ion-button>
                <ion-button
                  v-if="can('orders')"
                  fill="outline"
                  color="primary"
                  router-link="/pedidos"
                >
                  <ion-icon slot="start" name="receipt-outline"></ion-icon>Gerenciar pedidos
                </ion-button>
                <ion-button
                  v-if="can('store_theme')"
                  fill="outline"
                  color="warning"
                  router-link="/configurar-loja"
                >
                  <ion-icon slot="start" name="settings-outline"></ion-icon>Configurações
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card class="panel-card">
            <ion-card-content class="ion-text-center">
              <h2 class="card-subtitle">QR Code da loja</h2>
              <div class="qr-box">
                <img :src="qrSrc" alt="QR Code da loja" loading="lazy" />
              </div>
              <ion-button
                fill="outline"
                expand="block"
                class="ion-margin-top"
                @click="openQrHighRes"
              >
                <ion-icon slot="start" name="download-outline"></ion-icon>Baixar QR Code em alta
                resolução
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>
      </template>

      <!-- Pedidos recentes (polling do painel): dados REAIS de
        - `/orders/notifications`. Nome igual ao dropdown do web ("Pedidos
        - recentes" + "Ver todos") para NÃO confundir com a configuração de
        - notificações (`?tab=notificacoes`, mensagens automáticas). -->
      <ion-popover
        v-if="canOrders"
        trigger="notif-btn"
        class="top-pop"
        @didPresent="loadNotifications"
      >
        <ion-list lines="full">
          <ion-list-header>
            <ion-label>Pedidos recentes</ion-label>
            <ion-button fill="clear" size="small" @click="goOrders">Ver todos</ion-button>
          </ion-list-header>
          <ion-item v-if="notifBusy">
            <ion-spinner name="dots"></ion-spinner>
          </ion-item>
          <ion-item v-else-if="!notifications.length" lines="none">
            <ion-label>
              <p>Nenhum pedido novo por aqui.</p>
            </ion-label>
          </ion-item>
          <ion-item v-for="n in notifications" :key="n.id" :button="true" @click="openOrder(n.id)">
            <span class="notif-dot" slot="start"></span>
            <ion-label>
              <h3>Novo pedido #{{ n.number }}</h3>
              <p>{{ n.customer_name }} · {{ money(n.total) }} · {{ n.created_at }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-popover>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="1500"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import { useSessionStore } from '@/stores/session'
import { useShopStore } from '@/stores/shop'
import { api, qs } from '@/api/client'
import { routeApiError } from '@/composables/errors'

const session = useSessionStore()
const shop = useShopStore()
const router = useRouter()

const toastOpen = ref(false)
const toastMessage = ref('Link copiado')

/** Contadores reais do catálogo (permisão `products`), igual ao spike. */
const counts = reactive<{ categories: number | null; products: number | null }>({
  categories: null,
  products: null,
})

/** Notificações reais (GET /orders/notifications, permisão `orders`). */
const notifications = ref<
  Array<{ id: number; number: string; customer_name: string; total: number; created_at: string }>
>([])
const notifBusy = ref(false)

const perms = computed(() => new Set(shop.store?.permissions ?? []))
function can(permission: string): boolean {
  return perms.value.has(permission)
}
const canOrders = computed(() => perms.value.has('orders'))

const initial = computed(() => (session.user?.name ?? 'L').trim().charAt(0).toUpperCase() || 'L')

const statCards = computed(() => {
  if (can('products')) {
    return [
      {
        label: 'Categorias',
        value: counts.categories === null ? '—' : String(counts.categories),
        icon: 'grid-outline',
        chip: 'chip-blue',
        small: false,
      },
      {
        label: 'Produtos',
        value: counts.products === null ? '—' : String(counts.products),
        icon: 'cube-outline',
        chip: 'chip-green',
        small: false,
      },
      {
        label: 'Publicação',
        value: shop.store?.is_published ? 'Online' : 'Offline',
        icon: 'checkmark-circle-outline',
        chip: shop.store?.is_published ? 'chip-green' : 'chip-amber',
        small: false,
      },
    ]
  }
  // Sem permissão de catálogo: status da conta (dados reais de /me).
  return [
    {
      label: 'Publicação',
      value: shop.store?.is_published ? 'Online' : 'Offline',
      icon: 'checkmark-circle-outline',
      chip: shop.store?.is_published ? 'chip-green' : 'chip-amber',
      small: false,
    },
    {
      label: 'Plano',
      value: session.account?.plan ?? '—',
      icon: 'card-outline',
      chip: 'chip-blue',
      small: true,
    },
    {
      label: 'Acesso até',
      value: accessLabel.value,
      icon: 'calendar-outline',
      chip: 'chip-green',
      small: true,
    },
  ]
})

const accessLabel = computed(() => {
  const iso = session.account?.access_expires_at
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
})

const cachedLabel = computed(() => {
  if (!shop.cachedAt) return ''
  try {
    return new Date(shop.cachedAt).toLocaleString('pt-BR')
  } catch {
    return ''
  }
})

/** QR gerado a partir da public_url REAL da loja (sem dado mock). */
const qrSrc = computed(() => {
  const url = shop.store?.public_url ?? ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
})

function money(value: number): string {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

async function loadCounts() {
  if (!can('products')) return
  try {
    const [cats, prods] = await Promise.all([
      api.get<{ data: unknown[] }>('/categories'),
      api.get<{ data: unknown[]; meta: { total: number } }>(`/products${qs({ per_page: 1 })}`),
    ])
    counts.categories = cats.data?.length ?? 0
    counts.products = Number(prods.meta?.total ?? prods.data?.length ?? 0)
  } catch {
    /* sem permissão/conexão: fica '—' */
  }
}

async function loadNotifications() {
  notifBusy.value = true
  try {
    const res = await api.get<{
      latest_id: number
      orders: typeof notifications.value
      recent: typeof notifications.value
    }>(`/orders/notifications${qs({ after_id: 0 })}`)
    notifications.value = (res.orders?.length ? res.orders : res.recent) ?? []
  } catch {
    notifications.value = []
  } finally {
    notifBusy.value = false
  }
}

async function openOrder(id: number) {
  await router.push(`/pedidos/${id}`)
}

async function goOrders() {
  await router.push('/pedidos')
}

async function reload() {
  try {
    await shop.load()
    applyAccent()
    if (shop.planBlock) {
      await router.replace({
        name: 'plano-bloqueado',
        query: {
          plan: shop.planBlock.plan ?? '',
          feature: shop.planBlock.feature ?? '',
        },
      })
    } else if (shop.permissionDenied) {
      await router.replace({ name: 'sem-permissao' })
    } else {
      await loadCounts()
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    // erro de rede com cache cai em `stale`
  }
}

/** Respeita o accent_color da loja (contrato § identidade). */
function applyAccent() {
  document.documentElement.style.setProperty('--yz-accent', shop.accentColor)
  document.documentElement.style.setProperty('--ion-color-primary', shop.accentColor)
}

async function onRefresh(event: CustomEvent) {
  await reload()
  const target = event.target as unknown as { complete?: () => void }
  target.complete?.()
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shop.store?.public_url ?? '')
  } catch {
    /* clipboard indisponível */
  }
  toastMessage.value = 'Link copiado'
  toastOpen.value = true
}

async function openStore() {
  const url = shop.store?.public_url
  if (url) await Browser.open({ url })
}

/** QR em alta resolução abre no navegador do sistema (mesmo caminho do painel). */
async function openQrHighRes() {
  const url = shop.store?.public_url ?? ''
  await Browser.open({
    url: `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}`,
  })
}

/** Atalho p/ a página de afiliados (GET /affiliates: link + código + stats). */
async function goAffiliates() {
  await router.push('/afiliados')
}

onMounted(async () => {
  try {
    await session.refreshMe()
    if (!session.isActive) {
      await router.replace({ name: 'renovar' })
      return
    }
  } catch {
    /* segue para carregar do cache; 401 volta ao login via reload */
  }
  await reload()
})
</script>
