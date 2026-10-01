<template>
  <ion-page>
    <AppBar back back-href="/inicio" />
    <ion-content class="ion-padding">
      <PageHead title="Assinatura" sub="Conta" />

      <!-- Estado da conta (GET /plans → current + /me) -->
      <ion-card :color="session.isActive ? undefined : 'warning'">
        <ion-card-content>
          <div class="row-between">
            <div>
              <p class="stat-label">Plano atual</p>
              <p class="stat-num small">{{ session.account?.plan ?? current?.plan ?? '—' }}</p>
            </div>
            <div class="icon-chip" :class="session.isActive ? 'chip-green' : 'chip-amber'">
              <ion-icon name="card-outline"></ion-icon>
            </div>
          </div>
          <p class="hint">
            <template v-if="session.account?.access_expires_at">
              Acesso até {{ dateLabel(session.account.access_expires_at) }}.
            </template>
            <template v-else-if="!session.isActive">Sua conta está inativa.</template>
            <template v-else>{{ session.account?.message ?? 'Recursos ativos.' }}</template>
          </p>
          <ion-button
            v-if="!session.isActive && renewalUrl"
            expand="block"
            fill="outline"
            color="warning"
            @click="openRenewal"
          >
            <ion-icon slot="start" name="refresh-outline"></ion-icon>Renovar acesso
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Pagamento em andamento: status REAL vem do servidor (webhook MP). -->
      <ion-card v-if="pendingId">
        <ion-card-content>
          <div class="row-between">
            <div>
              <p class="stat-label">Pagamento em andamento</p>
              <p class="card-subtitle" style="margin: 0">{{ pollingLabel }}</p>
            </div>
            <ion-spinner v-if="polling" name="dots"></ion-spinner>
          </div>
          <p class="hint">
            {{ payment ? `Pedido ${payment.id} · ${money(payment.amount)}` : 'Abrindo o Mercado Pago…' }}
            O plano só é ativado após a confirmação do banco.
          </p>
          <div class="yz-actions">
            <ion-button size="small" fill="outline" :disabled="!polling" @click="checkStatus">
              <ion-icon slot="start" name="refresh-outline"></ion-icon>Atualizar status
            </ion-button>
            <ion-button size="small" fill="clear" color="medium" @click="cancelPending">
              Cancelar acompanhamento
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <div v-if="busy && !plans.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando planos…</p>
      </div>

      <ion-text v-else-if="error && !plans.length" color="danger">
        <div class="yz-state">
          <ion-icon name="diamond-outline"></ion-icon>
          <h3>Não foi possível carregar os planos</h3>
          <p>{{ error }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <!-- Planos reais (GET /plans) -->
      <ion-card v-for="plan in plans" :key="plan.id" class="plan-card">
        <ion-card-content>
          <div class="row-between">
            <div>
              <h2 class="card-title" style="margin: 0">{{ plan.name }}</h2>
              <p v-if="isCurrent(plan)" class="hint" style="margin: 2px 0 0">
                <ion-icon name="checkmark-circle-outline" style="vertical-align: -2px"></ion-icon>
                Plano atual
              </p>
            </div>
            <ion-chip v-if="plan.is_free" color="medium">Grátis</ion-chip>
          </div>

          <!-- Períodos com preço configurado -->
          <div v-if="paidPeriods(plan).length" class="yz-chips" style="margin-top: 10px">
            <ion-button
              v-for="p in paidPeriods(plan)"
              :key="p.key"
              size="small"
              :fill="selectedPeriod[plan.id] === p.key ? 'solid' : 'outline'"
              @click="selectedPeriod[plan.id] = p.key"
            >
              {{ p.label }}
              <span v-if="plan.prices[p.key] !== null" class="period-price">
                · {{ priceLabel(plan, p.key) }}
              </span>
            </ion-button>
          </div>
          <p v-else-if="!plan.is_free" class="hint">Preço não configurado para este plano.</p>

          <!-- Limites e recursos (dados reais do plano) -->
          <div class="yz-chips" style="margin-top: 8px">
            <ion-chip v-if="plan.limits.max_products !== null" color="primary">
              {{ plan.limits.max_products }} produtos
            </ion-chip>
            <ion-chip v-if="plan.limits.max_categories !== null" color="primary">
              {{ plan.limits.max_categories }} categorias
            </ion-chip>
            <ion-chip v-if="plan.limits.max_users !== null" color="primary">
              {{ plan.limits.max_users }} usuários
            </ion-chip>
            <ion-chip v-if="plan.features.finance" color="success">Financeiro</ion-chip>
            <ion-chip v-if="plan.features.stock" color="success">Estoque</ion-chip>
            <ion-chip v-if="plan.features.delivery_maps" color="success">Maps/entrega</ion-chip>
          </div>

          <ul v-if="plan.benefits.length" class="benefits">
            <li v-for="(benefit, i) in plan.benefits" :key="i">{{ benefit }}</li>
          </ul>

          <ion-button
            expand="block"
            :disabled="isCurrent(plan) || plan.is_free || checkingId === plan.id || busy"
            @click="subscribe(plan)"
          >
            <ion-icon slot="start" name="card-outline"></ion-icon>
            {{
              checkingId === plan.id
                ? 'Abrindo pagamento…'
                : isCurrent(plan)
                  ? 'Plano atual'
                  : plan.is_free
                    ? 'Plano gratuito'
                    : current?.plan
                      ? 'Mudar para este plano'
                      : 'Assinar'
            }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="3000"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import {
  billingApi,
  type BillingPayment,
  type BillingPeriod,
  type BillingPlan,
} from '@/api/billing'
import { apiMessage, routeApiError } from '@/composables/errors'
import { useSessionStore } from '@/stores/session'

const PENDING_KEY = 'yzap.pending_payment'
const PERIODS: Array<{ key: BillingPeriod; label: string }> = [
  { key: 'monthly', label: 'Mensal' },
  { key: 'semiannual', label: 'Semestral' },
  { key: 'annual', label: 'Anual' },
]

const session = useSessionStore()
const router = useRouter()

const plans = ref<BillingPlan[]>([])
const current = ref<{ plan: string | null; access_expires_at: string | null } | null>(null)
const busy = ref(true)
const error = ref<string | null>(null)
const checkingId = ref<number | null>(null)
const selectedPeriod = reactive<Record<number, BillingPeriod>>({})

const pendingId = ref<number | null>(null)
const payment = ref<BillingPayment | null>(null)
const polling = ref(false)
const pollingLabel = ref('Aguardando confirmação…')

const toastOpen = ref(false)
const toastMessage = ref('')

let timer: number | null = null
let resumeListener: { remove: () => Promise<void> } | null = null

const renewalUrl = computed(() => session.account?.renewal_url ?? null)

function money(value: number): string {
  try {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateLabel(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function isCurrent(plan: BillingPlan): boolean {
  return current.value?.plan === plan.name || session.account?.plan === plan.name
}

function paidPeriods(plan: BillingPlan): Array<{ key: BillingPeriod; label: string }> {
  return PERIODS.filter((p) => plan.prices[p.key] !== null)
}

function priceLabel(plan: BillingPlan, period: BillingPeriod): string {
  const value = plan.prices[period]
  return value === null ? '' : money(value)
}

async function load() {
  busy.value = true
  error.value = null
  try {
    const { data } = await billingApi.plans()
    plans.value = data.plans
    current.value = data.current
    for (const plan of data.plans) {
      if (!selectedPeriod[plan.id]) {
        selectedPeriod[plan.id] = paidPeriods(plan)[0]?.key ?? 'monthly'
      }
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    error.value = apiMessage(e)
  } finally {
    busy.value = false
  }
}

async function openRenewal() {
  const url = session.account?.renewal_url
  if (url) await Browser.open({ url })
}

/** Checkout: preferência criada no servidor → browser EXTERNO do sistema. */
async function subscribe(plan: BillingPlan) {
  const period = selectedPeriod[plan.id] ?? 'monthly'
  checkingId.value = plan.id
  try {
    const { data } = await billingApi.checkout(plan.id, period)
    pendingId.value = data.payment_id
    payment.value = null
    await Preferences.set({
      key: PENDING_KEY,
      value: JSON.stringify({ id: data.payment_id, plan: plan.name, at: Date.now() }),
    })
    startPolling()
    // Só abre o navegador; o retorno apenas NAVEGA — status vem da API.
    await Browser.open({ url: data.checkout_url })
    toast('Conclua o pagamento no navegador. O plano é ativado após a confirmação do banco.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    checkingId.value = null
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Aguardando pagamento',
    in_process: 'Em análise',
    approved: 'Aprovado',
    authorized: 'Autorizado',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
    refunded: 'Estornado',
    charged_back: 'Estornado',
    error: 'Erro no pagamento',
  }
  return map[status] ?? status
}

/** Polling de GET /billing/status/{payment} — a ativação vem do WEBHOOK. */
async function checkStatus() {
  if (!pendingId.value) return
  polling.value = true
  try {
    const { data } = await billingApi.status(pendingId.value)
    payment.value = data
    if (data.status === 'approved') {
      stopPolling()
      await Preferences.remove({ key: PENDING_KEY })
      pendingId.value = null
      pollingLabel.value = 'Pagamento aprovado'
      toast('Pagamento aprovado! Plano atualizado.')
      await session.refreshMe()
      await load()
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back', 'error'].includes(data.status)) {
      stopPolling()
      await Preferences.remove({ key: PENDING_KEY })
      pendingId.value = null
      pollingLabel.value = statusLabel(data.status)
      toast(`Pagamento: ${statusLabel(data.status)}.`)
    } else {
      pollingLabel.value = statusLabel(data.status)
    }
  } catch (e: unknown) {
    // 404 (pagamento de outro usuário) ou rede: mostra e mantém tentando.
    pollingLabel.value = apiMessage(e, 'Aguardando confirmação…')
  } finally {
    polling.value = false
  }
}

function startPolling() {
  stopPolling()
  void checkStatus()
  timer = window.setInterval(() => void checkStatus(), 5000)
}

function stopPolling() {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

async function cancelPending() {
  stopPolling()
  await Preferences.remove({ key: PENDING_KEY })
  pendingId.value = null
}

onMounted(async () => {
  // Retorno do browser/deeplink: apenas NAVEGA até aqui e retoma o polling.
  try {
    const { value } = await Preferences.get({ key: PENDING_KEY })
    if (value) {
      const saved = JSON.parse(value) as { id?: number }
      if (typeof saved.id === 'number') {
        pendingId.value = saved.id
        startPolling()
      }
    }
  } catch {
    /* sem pendência */
  }

  // Ao voltar o app para primeiro plano, checa imediatamente.
  try {
    resumeListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && pendingId.value) void checkStatus()
    })
  } catch {
    /* listener indisponível (web) */
  }

  await load()
})

onUnmounted(() => {
  stopPolling()
  void resumeListener?.remove()
})
</script>

<style scoped>
.plan-card {
  border: 1px solid transparent;
}
.period-price {
  font-weight: 700;
}
.benefits {
  margin: 10px 0 14px;
  padding-left: 18px;
  color: var(--ion-text-color);
  font-size: 0.88rem;
}
.benefits li {
  margin-bottom: 4px;
}
</style>
