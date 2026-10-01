<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Caixa" sub="Turnos e movimentos" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando caixa…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="lock-closed-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <!-- ---------- TURNO ABERTO ---------- -->
        <template v-if="openShift">
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>
                Turno aberto
                <ion-badge color="success">{{ openShift.status_label || 'aberto' }}</ion-badge>
              </h2>
              <p class="muted">
                Aberto em {{ dateTime(openShift.opened_at) }} · fundo
                {{ money(openShift.opening_amount ?? 0) }}
              </p>
              <div v-if="breakdown" class="breakdown">
                <div class="row-between">
                  <span>Esperado no caixa</span>
                  <strong>{{ money(breakdown.expected ?? 0) }}</strong>
                </div>
                <div class="row-between">
                  <span>Pedidos pagos</span>
                  <span>{{ money(breakdown.orders ?? 0) }}</span>
                </div>
                <div class="row-between">
                  <span>Entradas manuais</span>
                  <span>{{ money(breakdown.manual ?? 0) }}</span>
                </div>
                <div class="row-between">
                  <span>Saídas</span>
                  <span>-{{ money(breakdown.out ?? 0) }}</span>
                </div>
                <div class="row-between">
                  <span>Despesas</span>
                  <span>-{{ money(breakdown.expenses ?? 0) }}</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Movimento manual -->
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>Novo movimento</h2>
              <div class="yz-chips">
                <ion-chip :color="movement.type === 'in' ? 'success' : ''" @click="movement.type = 'in'">
                  <ion-icon name="arrow-up-circle-outline"></ion-icon>
                  <ion-label>Entrada</ion-label>
                </ion-chip>
                <ion-chip :color="movement.type === 'out' ? 'danger' : ''" @click="movement.type = 'out'">
                  <ion-icon name="arrow-down-circle-outline"></ion-icon>
                  <ion-label>Saída</ion-label>
                </ion-chip>
              </div>
              <div class="yz-form-grid">
                <div class="yz-field">
                  <label>Valor (R$) *</label>
                  <ion-input v-model="movement.amount" inputmode="decimal" placeholder="0,00"></ion-input>
                </div>
                <div class="yz-field full">
                  <label>Descrição *</label>
                  <ion-input
                    v-model="movement.description"
                    placeholder="Ex.: Suprimento, troco"
                    :maxlength="190"
                  ></ion-input>
                </div>
              </div>
              <ion-button size="small" :disabled="busy" @click="addMovement">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                Lançar
              </ion-button>
            </ion-card-content>
          </ion-card>

          <!-- Movimentos do turno -->
          <ion-card v-if="(openShift.movements ?? []).length" class="panel-card">
            <ion-card-content>
              <h2>Movimentos do turno</h2>
              <ion-list lines="full">
                <ion-item v-for="m in openShift.movements ?? []" :key="m.id">
                  <ion-icon
                    slot="start"
                    :name="m.type === 'in' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'"
                    :color="m.type === 'in' ? 'success' : 'danger'"
                  ></ion-icon>
                  <ion-label>
                    <h3>{{ m.description }}</h3>
                    <p>{{ dateTime(m.created_at) }}</p>
                  </ion-label>
                  <ion-note slot="end" class="price">
                    {{ m.type === 'in' ? '+' : '-' }}{{ money(m.amount) }}
                  </ion-note>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Fechar turno -->
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>Fechar turno</h2>
              <div class="yz-form-grid">
                <div class="yz-field">
                  <label>Contagem final (R$) *</label>
                  <ion-input v-model="closeForm.amount" inputmode="decimal" placeholder="0,00"></ion-input>
                </div>
                <div class="yz-field full">
                  <label>Observações</label>
                  <ion-input v-model="closeForm.notes" placeholder="opcional" :maxlength="500"></ion-input>
                </div>
              </div>
              <p class="hint">Divergência entre contagem e esperado fica registrada no turno.</p>
              <ion-button color="danger" :disabled="busy" @click="closeShift">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                Fechar caixa
              </ion-button>
            </ion-card-content>
          </ion-card>
        </template>

        <!-- ---------- SEM TURNO ABERTO ---------- -->
        <template v-else>
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>Abrir caixa</h2>
              <div class="yz-form-grid">
                <div class="yz-field">
                  <label>Fundo inicial (R$) *</label>
                  <ion-input v-model="openForm.amount" inputmode="decimal" placeholder="0,00"></ion-input>
                </div>
                <div class="yz-field full">
                  <label>Observações</label>
                  <ion-input v-model="openForm.notes" placeholder="opcional" :maxlength="500"></ion-input>
                </div>
              </div>
              <ion-button :disabled="busy" @click="openShiftNow">
                <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                Abrir turno
              </ion-button>
            </ion-card-content>
          </ion-card>
        </template>
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
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { financeApi, type CashShift } from '@/api/finance'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const state = ref<{ open: CashShift | null; breakdown?: Record<string, number | null> | null } | null>(null)
const loading = ref(true)
const busy = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const openForm = reactive({ amount: '', notes: '' })
const closeForm = reactive({ amount: '', notes: '' })
const movement = reactive({ type: 'in' as 'in' | 'out', amount: '', description: '' })

const openShift = computed(() => state.value?.open ?? null)
const breakdown = computed(() => state.value?.breakdown ?? null)

function money(value: number): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateTime(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return value
  }
}

function toNumber(raw: string): number {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await financeApi.cash({ per_page: 10 })
    state.value = data
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

async function openShiftNow() {
  const amount = toNumber(openForm.amount)
  if (!Number.isFinite(amount) || amount < 0) {
    toast('Informe o fundo inicial.')
    return
  }
  busy.value = true
  try {
    await financeApi.openCash({ opening_amount: amount, notes: openForm.notes || undefined })
    toast('Caixa aberto.')
    openForm.amount = ''
    openForm.notes = ''
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    busy.value = false
  }
}

async function addMovement() {
  const registerId = openShift.value?.id
  if (!registerId) return
  const amount = toNumber(movement.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    toast('Informe um valor maior que zero.')
    return
  }
  if (!movement.description.trim()) {
    toast('Descreva o movimento.')
    return
  }
  busy.value = true
  try {
    await financeApi.cashMovement(registerId, {
      type: movement.type,
      amount,
      description: movement.description.trim(),
    })
    toast('Movimento lançado.')
    movement.amount = ''
    movement.description = ''
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    busy.value = false
  }
}

async function closeShift() {
  const registerId = openShift.value?.id
  if (!registerId) return
  const amount = toNumber(closeForm.amount)
  if (!Number.isFinite(amount) || amount < 0) {
    toast('Informe a contagem final.')
    return
  }
  const ok = window.confirm('Fechar o caixa agora? O turno não pode ser reaberto.')
  if (!ok) return
  busy.value = true
  try {
    await financeApi.closeCash(registerId, {
      closing_amount: amount,
      closing_notes: closeForm.notes || undefined,
    })
    toast('Caixa fechado.')
    closeForm.amount = ''
    closeForm.notes = ''
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.panel-card {
  background: var(--yz-card);
}
.breakdown {
  margin-top: 10px;
  font-size: 13px;
  display: grid;
  gap: 6px;
  color: var(--yz-muted);
}
.hint {
  margin: 8px 0 12px;
  font-size: 12px;
  color: var(--yz-muted);
}
</style>
