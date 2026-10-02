<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <PageHead title="Pedidos" sub="Operação" />

      <!-- Scopes do contrato: open|completed|cancelled|all (padrão `open`).
        Botões com rolagem horizontal: rótulo completo, sem truncar. -->
      <div class="scope-tabs" role="tablist" aria-label="Filtrar pedidos por situação">
        <button
          v-for="s in ORDER_SCOPES"
          :key="s.value"
          type="button"
          role="tab"
          :aria-selected="scope === s.value ? 'true' : 'false'"
          :class="['scope-tab', { active: scope === s.value }]"
          @click="setScope(s.value)"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar por número ou cliente"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
        <ion-select
          :value="statusFilter"
          interface="action-sheet"
          placeholder="Status"
          @ionChange="onStatus"
        >
          <ion-select-option value="">Todos os status</ion-select-option>
          <ion-select-option v-for="s in ORDER_STATUSES" :key="s" :value="s">
            {{ STATUS_LABELS[s] }}
          </ion-select-option>
        </ion-select>
      </div>

      <div v-if="newCount > 0" class="yz-chips">
        <ion-button size="small" fill="outline" @click="applyNew">
          <ion-icon slot="start" name="refresh-outline"></ion-icon>
          {{ newCount }} {{ newCount === 1 ? 'pedido novo' : 'pedidos novos' }} — atualizar
        </ion-button>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando pedidos…</p>
      </div>

      <ion-text v-else-if="list.error && !list.items.length" color="danger">
        <div class="yz-state">
          <ion-icon name="receipt-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ list.error }}</p>
          <ion-button fill="outline" @click="refresh">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="list.items.length" lines="full">
          <ion-item
            v-for="order in list.items"
            :key="order.id"
            :button="true"
            detail
            @click="open(order.id)"
          >
            <ion-label>
              <h3>
                #{{ order.number }}
                <ion-badge :color="statusColor(order.status)" :class="statusClass(order.status)">
                  {{ order.status_label || STATUS_LABELS[order.status] || order.status }}
                </ion-badge>
              </h3>
              <p>
                {{ order.customer?.name || 'Cliente' }} ·
                {{ dateTime(order.created_at) }}
                <template v-if="order.fulfillment_type === 'pickup'"> · retirada</template>
                <template v-else-if="order.fulfillment_type === 'delivery'"> · entrega</template>
              </p>
            </ion-label>
            <ion-note slot="end" class="price">{{ money(order.total ?? 0) }}</ion-note>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="receipt-outline"></ion-icon>
          <h3>Nenhum pedido aqui</h3>
          <p>{{ emptyHint }}</p>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </template>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2200"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { ordersApi, ORDER_STATUSES, STATUS_LABELS } from '@/api/orders'
import { routeApiError } from '@/composables/errors'
import { statusClass, statusColor } from '@/composables/orderStatus'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

/** Scopes exatos de GET /orders (contrato § grupo 6). Sem contadores na API. */
const ORDER_SCOPES = [
  { value: 'open', label: 'Aberto' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'all', label: 'Todos' },
] as const
type OrderScope = (typeof ORDER_SCOPES)[number]['value']

const router = useRouter()
const search = ref('')
const scope = ref<OrderScope>('open')
const statusFilter = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

/** Polling de /orders/notifications (mesmo payload do painel). */
const lastLatestId = ref(0)
const newCount = ref(0)
let pollTimer: ReturnType<typeof setInterval> | null = null

const list = useList((page: number) =>
  ordersApi.list({
    page,
    per_page: 20,
    scope: scope.value,
    status: statusFilter.value || undefined,
    search: search.value.trim() || undefined,
  }),
)

const emptyHint = computed(() => {
  if (search.value) return 'Nenhum pedido corresponde à busca.'
  if (statusFilter.value) return 'Nenhum pedido com esse status.'
  if (scope.value === 'open') return 'Nenhum pedido aberto no momento.'
  if (scope.value === 'completed') return 'Nenhum pedido concluído ainda.'
  if (scope.value === 'cancelled') return 'Nenhum pedido cancelado.'
  return 'Os pedidos da loja aparecem aqui.'
})

function money(value: number): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateTime(value?: string): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function refresh() {
  try {
    await list.refresh()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
  }
}

function setScope(value: OrderScope) {
  if (scope.value === value) return
  scope.value = value
  void refresh()
}

function onStatus(event: CustomEvent) {
  statusFilter.value = String(event.detail?.value ?? '')
  void refresh()
}

async function onInfinite(event: CustomEvent) {
  try {
    await list.loadMore()
  } catch {
    /* erro já em list.error */
  } finally {
    const target = event.target as HTMLIonInfiniteScrollElement | null
    target?.complete()
  }
}

async function onRefresh(event: CustomEvent) {
  await refresh()
  await poll()
  const target = event.target as unknown as { complete?: () => void }
  target.complete?.()
}

async function open(id: number) {
  await router.push(`/pedidos/${id}`)
}

/** Polling discreto: só avisa quando chega pedido mais novo (não reescreve a lista). */
async function poll() {
  try {
    const before = lastLatestId.value
    const res = await ordersApi.notifications(before)
    const latest = Number(res.latest_id ?? 0)
    if (before > 0 && latest > before) {
      newCount.value = (res.orders ?? []).filter((o) => o.id > before).length || 1
    }
    if (latest > 0) lastLatestId.value = latest
  } catch {
    /* sem conexão/permissão: sem aviso */
  }
}

async function applyNew() {
  newCount.value = 0
  await refresh()
}

onMounted(async () => {
  await refresh()
  await poll()
  pollTimer = setInterval(() => void poll(), 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
})
</script>

<style scoped>
/* Abas de scope: rolagem horizontal suave no mobile, distribuídas no desktop.
 * Rótulo sempre completo (sem ellipsis): cada aba tem largura própria. */
.scope-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  padding: 2px 2px 10px;
  margin-bottom: 4px;
}
.scope-tab {
  flex: 0 0 auto;
  white-space: nowrap;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 99px;
  border: 1px solid var(--yz-mist);
  background: var(--yz-card);
  color: var(--ion-text-color);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.scope-tab.active {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.scope-tab:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}
@media (min-width: 768px) {
  .scope-tabs {
    overflow: visible;
  }
  .scope-tab {
    flex: 1 1 0;
  }
}
ion-searchbar {
  --box-shadow: none;
}
ion-select {
  max-width: 150px;
}
</style>
