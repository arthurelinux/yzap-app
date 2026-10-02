<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Financeiro" sub="Fluxo, receita e despesas" />

      <ion-segment :value="tab" mode="md" @ionChange="onTab">
        <ion-segment-button value="cashflow">
          <ion-label>Fluxo</ion-label>
        </ion-segment-button>
        <ion-segment-button value="revenue">
          <ion-label>Receita</ion-label>
        </ion-segment-button>
        <ion-segment-button value="expenses">
          <ion-label>Despesas</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- ---------- FLUXO ---------- -->
      <template v-if="tab === 'cashflow'">
        <div class="yz-toolbar-row">
          <ion-item lines="none">
            <ion-label position="stacked">De</ion-label>
            <ion-input :value="from" type="date" @ionChange="from = detailValue($event)"></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Até</ion-label>
            <ion-input :value="to" type="date" @ionChange="to = detailValue($event)"></ion-input>
          </ion-item>
        </div>

        <div v-if="cashBusy" class="yz-state">
          <ion-spinner></ion-spinner>
          <p>Carregando fluxo…</p>
        </div>

        <ion-text v-else-if="cashError" color="danger">
          <div class="yz-state">
            <ion-icon name="wallet-outline"></ion-icon>
            <h3>Não foi possível carregar</h3>
            <p>{{ cashError }}</p>
            <ion-button fill="outline" @click="loadCashflow">Tentar de novo</ion-button>
          </div>
        </ion-text>

        <template v-else-if="cashflow">
          <div class="stat-grid">
            <ion-card class="stat-card">
              <ion-card-content>
                <p class="stat-label">Entradas</p>
                <p class="stat-num small">{{ money(cashflow.income) }}</p>
                <div class="icon-chip chip-green"><ion-icon name="trending-up-outline"></ion-icon></div>
              </ion-card-content>
            </ion-card>
            <ion-card class="stat-card">
              <ion-card-content>
                <p class="stat-label">Saídas</p>
                <p class="stat-num small">{{ money(cashflow.expense) }}</p>
                <div class="icon-chip chip-red"><ion-icon name="trending-down-outline"></ion-icon></div>
              </ion-card-content>
            </ion-card>
            <ion-card class="stat-card">
              <ion-card-content>
                <p class="stat-label">Resultado</p>
                <p class="stat-num small">{{ money(cashflow.result) }}</p>
                <div class="icon-chip chip-blue"><ion-icon name="wallet-outline"></ion-icon></div>
              </ion-card-content>
            </ion-card>
          </div>

          <ion-card v-if="(cashflow.by_category ?? []).length" class="panel-card">
            <ion-card-content>
              <h2>Saídas por categoria</h2>
              <ion-list lines="full">
                <ion-item v-for="cat in cashflow.by_category ?? []" :key="cat.key">
                  <ion-label>{{ cat.label }}</ion-label>
                  <ion-note slot="end" class="price">{{ money(cat.total) }}</ion-note>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </template>
      </template>

      <!-- ---------- RECEITA ---------- -->
      <template v-else-if="tab === 'revenue'">
        <div v-if="revBusy && !revenue.length" class="yz-state">
          <ion-spinner></ion-spinner>
          <p>Carregando receita…</p>
        </div>

        <ion-text v-else-if="revError" color="danger">
          <div class="yz-state">
            <ion-icon name="card-outline"></ion-icon>
            <h3>Não foi possível carregar</h3>
            <p>{{ revError }}</p>
            <ion-button fill="outline" @click="loadRevenue">Tentar de novo</ion-button>
          </div>
        </ion-text>

        <template v-else>
          <div v-if="revSummary" class="yz-meta">
            <strong>Total:</strong> {{ money(revSummary.total) }} ·
            <strong>Pedidos:</strong> {{ revSummary.count }} ·
            <strong>Ticket médio:</strong> {{ money(revSummary.average) }}
          </div>
          <ion-list v-if="revenue.length" lines="full" class="card">
            <ion-item v-for="row in revenue" :key="row.id">
              <ion-label>
                <h3>#{{ row.number || row.id }}</h3>
                <p>
                  {{ dateTime(row.paid_at ?? row.created_at) }}
                  <template v-if="row.payment_method"> · {{ row.payment_method }}</template>
                </p>
              </ion-label>
              <ion-note slot="end" class="price">{{ money(row.total ?? 0) }}</ion-note>
            </ion-item>
          </ion-list>
          <div v-else class="yz-state">
            <ion-icon name="card-outline"></ion-icon>
            <h3>Sem receita no período</h3>
            <p>Pedidos pagos aparecem aqui.</p>
          </div>
        </template>
      </template>

      <!-- ---------- DESPESAS ---------- -->
      <template v-else>
        <div class="yz-toolbar-row">
          <ion-select
            :value="expStatus"
            interface="action-sheet"
            placeholder="Status"
            @ionChange="onExpStatus"
          >
            <ion-select-option value="">Todas</ion-select-option>
            <ion-select-option value="pending">Pendentes</ion-select-option>
            <ion-select-option value="paid">Pagas</ion-select-option>
            <ion-select-option value="cancelled">Canceladas</ion-select-option>
          </ion-select>
          <ion-button size="small" fill="outline" router-link="/financeiro/despesas/nova">
            <ion-icon slot="start" name="add-outline"></ion-icon>Nova
          </ion-button>
        </div>

        <div v-if="expBusy && !expenses.length" class="yz-state">
          <ion-spinner></ion-spinner>
          <p>Carregando despesas…</p>
        </div>

        <ion-text v-else-if="expError" color="danger">
          <div class="yz-state">
            <ion-icon name="cash-outline"></ion-icon>
            <h3>Não foi possível carregar</h3>
            <p>{{ expError }}</p>
            <ion-button fill="outline" @click="loadExpenses">Tentar de novo</ion-button>
          </div>
        </ion-text>

        <template v-else>
          <div v-if="expTotals" class="yz-meta">
            <strong>Pendentes:</strong> {{ money(expTotals.pending ?? 0) }} ·
            <strong>Pagas:</strong> {{ money(expTotals.paid ?? 0) }}
          </div>
          <ion-list v-if="expenses.length" lines="full" class="card">
            <ion-item
              v-for="exp in expenses"
              :key="exp.id"
              :button="true"
              detail
              @click="openExpense(exp.id)"
            >
              <ion-label>
                <h3>
                  {{ exp.description }}
                  <ion-badge
                    :color="
                      exp.status === 'paid' ? 'success' : exp.status === 'cancelled' ? 'medium' : 'warning'
                    "
                  >
                    {{ exp.status_label || exp.status }}
                  </ion-badge>
                </h3>
                <p>
                  {{ exp.category_label || exp.category }} · vence
                  {{ date(exp.due_date) }}
                </p>
              </ion-label>
              <ion-note slot="end" class="price">{{ money(Number(exp.amount)) }}</ion-note>
            </ion-item>
          </ion-list>
          <div v-else class="yz-state">
            <ion-icon name="cash-outline"></ion-icon>
            <h3>Nenhuma despesa</h3>
            <p>Registre aluguel, insumos e contas do mês.</p>
          </div>
        </template>
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
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { financeApi, type Cashflow, type Expense, type RevenueRow } from '@/api/finance'
import { routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const tab = ref<'cashflow' | 'revenue' | 'expenses'>('cashflow')
const toastOpen = ref(false)
const toastMessage = ref('')

function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const from = ref(today(-30))
const to = ref(today())

const cashflow = ref<Cashflow | null>(null)
const cashBusy = ref(false)
const cashError = ref('')

const revenue = ref<RevenueRow[]>([])
const revSummary = ref<{ total: number; count: number; average: number } | null>(null)
const revBusy = ref(false)
const revError = ref('')

const expenses = ref<Expense[]>([])
const expTotals = ref<{ pending?: number; paid?: number } | null>(null)
const expStatus = ref('')
const expBusy = ref(false)
const expError = ref('')

function money(value: number): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function date(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('pt-BR')
  } catch {
    return value
  }
}

function dateTime(value?: string | null): string {
  if (!value) return '—'
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

function detailValue(event: unknown): string {
  const detail = (event as CustomEvent<{ value?: string | number }>)?.detail
  return String(detail?.value ?? '')
}

function onTab(event: CustomEvent) {
  const value = String(event.detail?.value ?? 'cashflow')
  tab.value = value as typeof tab.value
  if (tab.value === 'cashflow') void loadCashflow()
  if (tab.value === 'revenue') void loadRevenue()
  if (tab.value === 'expenses') void loadExpenses()
}

function onExpStatus(event: CustomEvent) {
  expStatus.value = String(event.detail?.value ?? '')
  void loadExpenses()
}

async function loadCashflow() {
  cashBusy.value = true
  cashError.value = ''
  try {
    const { data } = await financeApi.cashflow({ from: from.value, to: to.value })
    cashflow.value = data
  } catch (e: unknown) {
    cashflow.value = null
    if (await routeApiError(e, router)) return
    cashError.value = e instanceof Error ? e.message : 'Falha ao carregar o fluxo.'
  } finally {
    cashBusy.value = false
  }
}

async function loadRevenue() {
  revBusy.value = true
  revError.value = ''
  try {
    const res = await financeApi.revenue({ from: from.value, to: to.value, per_page: 30 })
    revenue.value = res.data ?? []
    revSummary.value = res.meta?.summary ?? null
  } catch (e: unknown) {
    revenue.value = []
    if (await routeApiError(e, router)) return
    revError.value = e instanceof Error ? e.message : 'Falha ao carregar a receita.'
  } finally {
    revBusy.value = false
  }
}

async function loadExpenses() {
  expBusy.value = true
  expError.value = ''
  try {
    const res = await financeApi.expenses({
      from: from.value,
      to: to.value,
      status: expStatus.value || undefined,
      per_page: 30,
    })
    expenses.value = res.data ?? []
    expTotals.value = res.meta?.totals ?? null
  } catch (e: unknown) {
    expenses.value = []
    if (await routeApiError(e, router)) return
    expError.value = e instanceof Error ? e.message : 'Falha ao carregar as despesas.'
  } finally {
    expBusy.value = false
  }
}

async function openExpense(id: number) {
  await router.push(`/financeiro/despesas/${id}`)
}

// Recarrega o fluxo quando o período muda (só na aba de fluxo).
let periodTimer: ReturnType<typeof setTimeout> | null = null
function scheduleCashflow() {
  if (tab.value !== 'cashflow') return
  if (periodTimer) clearTimeout(periodTimer)
  periodTimer = setTimeout(() => void loadCashflow(), 500)
}

onMounted(() => {
  void loadCashflow()
})

watch([from, to], scheduleCashflow)
</script>

<style scoped>
.yz-meta {
  margin: 12px 0;
  font-size: 13px;
  color: var(--yz-muted);
}
.card {
  background: var(--ion-card-background);
  border-radius: 13px;
  overflow: hidden;
}
.yz-toolbar-row ion-item {
  flex: 1;
}
</style>
