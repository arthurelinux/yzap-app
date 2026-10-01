<template>
  <ion-page>
    <AppBar back back-href="/pedidos" />
    <ion-content class="ion-padding">
      <PageHead :title="`Pedido #${order.number || ''}`" :sub="fulfillmentLabel" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando pedido…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="receipt-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <div class="status-current">
          <ion-badge :color="statusColor(order.status)" class="big">
            {{ order.status_label || (order.status ? STATUS_LABELS[order.status] : '') || order.status || '—' }}
          </ion-badge>
          <span class="muted">{{ dateTime(order.created_at) }}</span>
          <ion-badge v-if="order.notification === 'sent'" color="success">
            cliente avisado
          </ion-badge>
          <ion-badge v-else-if="order.notification === 'failed'" color="danger">
            WhatsApp falhou
          </ion-badge>
        </div>

        <!-- Troca de status: mesma máquina do 7 status do painel. -->
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>Avançar status</h2>
            <div class="yz-chips">
              <ion-button
                v-for="s in availableStatuses"
                :key="s"
                size="small"
                :fill="s === 'cancelled' ? 'outline' : 'solid'"
                :color="s === 'cancelled' ? 'danger' : 'primary'"
                :disabled="busy"
                @click="changeStatus(s)"
              >
                {{ STATUS_LABELS[s] }}
              </ion-button>
            </div>
            <p v-if="busy" class="hint">Aplicando… o servidor baixa/estorna estoque e avisa o cliente.</p>
          </ion-card-content>
        </ion-card>

        <ion-list lines="full" class="card">
          <ion-item>
            <ion-label>
              <h3>{{ order.customer?.name || 'Cliente' }}</h3>
              <p v-if="order.customer?.phone">{{ order.customer.phone }}</p>
              <p v-if="order.customer?.address">{{ order.customer.address }}</p>
            </ion-label>
            <ion-icon
              v-if="order.customer?.phone"
              slot="end"
              name="call-outline"
              :style="{ cursor: 'pointer' }"
              @click="callCustomer"
            ></ion-icon>
          </ion-item>
          <ion-item v-for="(item, i) in order.items ?? []" :key="i">
            <ion-label>
              <h3>{{ item.quantity }}× {{ item.name }}</h3>
              <p v-if="item.variant_name">{{ item.variant_name }}</p>
              <p v-if="item.options && item.options.length">
                {{ item.options.join(' · ') }}
              </p>
            </ion-label>
            <ion-note slot="end" class="price">{{ money(item.subtotal ?? 0) }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Total do pedido</ion-label>
            <ion-note slot="end" class="price">
              {{ money(order.total ?? 0) }}
              <template v-if="order.delivery_fee">
                (entrega {{ money(order.delivery_fee) }})
              </template>
            </ion-note>
          </ion-item>
          <ion-item lines="none">
            <ion-label>Pagamento</ion-label>
            <ion-note slot="end">
              {{ order.payment_method || '—' }}
              <template v-if="order.payment_status"> · {{ order.payment_status }}</template>
            </ion-note>
          </ion-item>
        </ion-list>
      </template>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2600"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import {
  ordersApi,
  ORDER_STATUSES,
  STATUS_LABELS,
  type Order,
  type OrderStatus,
} from '@/api/orders'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const order = reactive<Partial<Order>>({})
const loading = ref(true)
const busy = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const fulfillmentLabel = computed(() =>
  order.fulfillment_type === 'pickup' ? 'Retirada' : order.fulfillment_type === 'delivery' ? 'Entrega' : 'Pedido',
)

/** Próximos status plausíveis: os que vêm depois do atual + cancelar. */
const availableStatuses = computed<OrderStatus[]>(() => {
  const current = order.status
  const idx = ORDER_STATUSES.indexOf(current as OrderStatus)
  const next = idx >= 0 ? ORDER_STATUSES.slice(idx + 1).filter((s) => s !== 'cancelled') : ORDER_STATUSES
  const out: OrderStatus[] = [...next]
  if (current !== 'cancelled' && current !== 'completed') out.push('cancelled')
  return out
})

function statusColor(status?: string): string {
  switch (status) {
    case 'received':
      return 'warning'
    case 'confirmed':
      return 'primary'
    case 'preparing':
      return 'secondary'
    case 'ready':
      return 'tertiary'
    case 'out_for_delivery':
      return 'success'
    case 'completed':
      return 'medium'
    case 'cancelled':
      return 'danger'
    default:
      return 'medium'
  }
}

function money(value: number): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateTime(value?: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return value
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await ordersApi.get(id)
    Object.assign(order, data)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

/** PATCH /orders/{order}/status com Idempotency-Key (gerado no módulo da API). */
async function changeStatus(status: OrderStatus) {
  if (status === 'cancelled') {
    const ok = window.confirm('Cancelar este pedido? O servidor estorna o estoque e avisa o cliente.')
    if (!ok) return
  }
  busy.value = true
  try {
    const { data } = await ordersApi.setStatus(id, status)
    Object.assign(order, data)
    toast(
      data.notification === 'sent'
        ? 'Status atualizado — cliente avisado no WhatsApp.'
        : 'Status atualizado.',
    )
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    busy.value = false
  }
}

function callCustomer() {
  const phone = (order.customer?.phone ?? '').replace(/\D/g, '')
  if (phone) window.open(`tel:${phone}`, '_self')
}

onMounted(load)
</script>

<style scoped>
.status-current {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.status-current .big {
  font-size: 14px;
  padding: 6px 12px;
}
.card {
  background: var(--yz-card);
  border-radius: 13px;
  overflow: hidden;
  margin-top: 14px;
}
.hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--yz-muted);
}
</style>
