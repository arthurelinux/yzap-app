<template>
  <ion-page>
    <AppBar back back-href="/clientes" />
    <ion-content class="ion-padding">
      <PageHead :title="customer?.name ?? 'Cliente'" sub="Clientes" />

      <div v-if="busy" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando cliente…</p>
      </div>

      <ion-text v-else-if="error" color="danger">
        <div class="yz-state">
          <ion-icon name="people-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ error }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else-if="customer">
        <ion-card>
          <ion-card-content>
            <div class="row-between">
              <div class="member-head">
                <div class="avatar-a big">{{ (customer.name || '?').charAt(0).toUpperCase() }}</div>
                <div>
                  <h2 class="card-title" style="margin: 0">{{ customer.name }}</h2>
                  <p class="hint">cliente desde {{ dateShort(customer.created_at) }}</p>
                </div>
              </div>
            </div>

            <div class="info-rows">
              <div class="info-row">
                <ion-icon name="call-outline"></ion-icon>
                <span>{{ customer.phone }}</span>
                <ion-button
                  v-if="customer.phone"
                  size="small"
                  fill="clear"
                  color="success"
                  @click="openWhatsapp"
                >
                  WhatsApp
                </ion-button>
              </div>
              <div v-if="addressLine" class="info-row">
                <ion-icon name="location-outline"></ion-icon>
                <span>{{ addressLine }}</span>
              </div>
              <div v-if="customer.last_order_at" class="info-row">
                <ion-icon name="receipt-outline"></ion-icon>
                <span>último pedido em {{ dateShort(customer.last_order_at) }}</span>
              </div>
            </div>

            <div class="yz-actions">
              <ion-button fill="outline" :router-link="`/clientes/${customer.id}/editar`">
                <ion-icon slot="start" name="create-outline"></ion-icon>Editar
              </ion-button>
              <ion-button fill="outline" color="danger" @click="confirmRemove">
                <ion-icon slot="start" name="trash-outline"></ion-icon>Excluir
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Stats reais do GET /customers/{id} -->
        <div class="stat-grid">
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Pedidos</p>
                <p class="stat-num">{{ customer.stats.orders_count }}</p>
              </div>
              <div class="icon-chip chip-blue"><ion-icon name="receipt-outline"></ion-icon></div>
            </ion-card-content>
          </ion-card>
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Total gasto</p>
                <p class="stat-num small">{{ money(customer.stats.total_spent) }}</p>
              </div>
              <div class="icon-chip chip-green"><ion-icon name="wallet-outline"></ion-icon></div>
            </ion-card-content>
          </ion-card>
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Ticket médio</p>
                <p class="stat-num small">{{ money(customer.stats.average_ticket) }}</p>
              </div>
              <div class="icon-chip chip-violet"><ion-icon name="trending-up-outline"></ion-icon></div>
            </ion-card-content>
          </ion-card>
        </div>

        <ion-card>
          <ion-card-content>
            <h2 class="card-title">Pedidos recentes</h2>
            <ion-list v-if="customer.recent_orders.length" lines="full">
              <ion-item
                v-for="order in customer.recent_orders"
                :key="order.id"
                :button="true"
                detail
                @click="openOrder(order.id)"
              >
                <ion-label>
                  <h3>#{{ order.number }}</h3>
                  <p>{{ dateShort(order.created_at) }} · {{ statusLabel(order.status) }}</p>
                </ion-label>
                <ion-note slot="end" class="price">{{ money(order.total) }}</ion-note>
              </ion-item>
            </ion-list>
            <p v-else class="hint">Nenhum pedido registrado.</p>
          </ion-card-content>
        </ion-card>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  alertController,
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
import { Browser } from '@capacitor/browser'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import { customersApi, type CustomerDetail } from '@/api/customers'
import { apiMessage, routeApiError } from '@/composables/errors'

const route = useRoute()
const router = useRouter()

const customer = ref<CustomerDetail | null>(null)
const busy = ref(true)
const error = ref<string | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

const addressLine = computed(() => {
  const c = customer.value
  if (!c) return ''
  return [c.street, c.number, c.neighborhood, c.city, c.state].filter(Boolean).join(', ')
})

function money(value: number): string {
  try {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    received: 'Recebido',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Pronto',
    out_for_delivery: 'Saiu para entrega',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    draft: 'Rascunho',
  }
  return map[status] ?? status
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  busy.value = true
  error.value = null
  try {
    const { data } = await customersApi.get(String(route.params.id))
    customer.value = data
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    error.value = apiMessage(e)
  } finally {
    busy.value = false
  }
}

async function openWhatsapp() {
  const phone = (customer.value?.phone ?? '').replace(/\D/g, '')
  if (phone) await Browser.open({ url: `https://wa.me/${phone}` })
}

async function openOrder(id: number) {
  await router.push(`/pedidos/${id}`)
}

async function confirmRemove() {
  const alert = await alertController.create({
    header: 'Excluir cliente?',
    message: 'Clientes com pedidos vinculados não podem ser excluídos.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      { text: 'Excluir', role: 'destructive', handler: () => void remove() },
    ],
  })
  await alert.present()
}

async function remove() {
  try {
    await customersApi.remove(String(route.params.id))
    toast('Cliente excluído')
    await router.replace('/clientes')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  }
}

onMounted(load)
</script>

<style scoped>
.member-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.avatar-a.big {
  width: 46px;
  height: 46px;
  font-size: 1.1rem;
}
.info-rows {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-text-color);
  font-size: 0.92rem;
}
.info-row ion-icon {
  color: var(--yz-muted);
  flex: none;
}
</style>
