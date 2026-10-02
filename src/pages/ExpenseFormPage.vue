<template>
  <ion-page>
    <AppBar back back-href="/financeiro" />
    <ion-content class="ion-padding">
      <PageHead :title="isEdit ? 'Editar despesa' : 'Nova despesa'" sub="Financeiro" />

      <div v-if="isEdit && loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando despesa…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="cash-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <form v-else @submit.prevent="save">
        <ion-list lines="full" class="card">
          <ion-item>
            <ion-label position="stacked">Descrição *</ion-label>
            <ion-input v-model="form.description" placeholder="Ex.: Aluguel de outubro" :maxlength="255"></ion-input>
            <p v-if="err('description')" class="err-text">{{ err('description') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Categoria *</ion-label>
            <ion-select
              :value="form.category"
              interface="action-sheet"
              placeholder="Selecione"
              @ionChange="form.category = String($event.detail?.value ?? '')"
            >
              <ion-select-option v-for="cat in EXPENSE_CATEGORIES" :key="cat.key" :value="cat.key">
                {{ cat.label }}
              </ion-select-option>
            </ion-select>
            <p v-if="err('category')" class="err-text">{{ err('category') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Valor (R$) *</ion-label>
            <ion-input v-model="form.amount" inputmode="decimal" placeholder="0,00"></ion-input>
            <p v-if="err('amount')" class="err-text">{{ err('amount') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Vencimento *</ion-label>
            <ion-input :value="form.due_date" type="date" @ionChange="form.due_date = detailValue($event)"></ion-input>
            <p v-if="err('due_date')" class="err-text">{{ err('due_date') }}</p>
          </ion-item>
          <ion-item v-if="isEdit">
            <ion-label position="stacked">Situação</ion-label>
            <ion-select
              :value="form.status"
              interface="action-sheet"
              @ionChange="form.status = String($event.detail?.value ?? 'pending')"
            >
              <ion-select-option value="pending">Pendente</ion-select-option>
              <ion-select-option value="paid">Pago</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Observações</ion-label>
            <ion-textarea v-model="form.notes" :rows="2" auto-grow :maxlength="1000"></ion-textarea>
          </ion-item>
        </ion-list>

        <div class="yz-field">
          <label>{{ original.receipt_url ? 'Trocar comprovante' : 'Comprovante' }}</label>
          <input type="file" accept="image/*,.pdf,application/pdf" @change="pickFile" />
          <p class="hint">JPG, PNG ou PDF até 5 MB.</p>
          <a
            v-if="original.receipt_url"
            :href="original.receipt_url"
            target="_blank"
            rel="noopener"
          >
            Ver comprovante atual
          </a>
          <ion-button
            v-if="isEdit && original.receipt_url"
            size="small"
            fill="outline"
            color="danger"
            :disabled="saving"
            @click="removeReceipt = true"
          >
            Remover comprovante
          </ion-button>
        </div>

        <div class="yz-actions">
          <ion-button type="submit" :disabled="saving">
            <ion-spinner v-if="saving" name="crescent"></ion-spinner>
            Salvar
          </ion-button>
          <ion-button
            v-if="isEdit && original.status !== 'cancelled'"
            fill="outline"
            color="danger"
            :disabled="saving"
            @click="cancelExpense"
          >
            Cancelar despesa
          </ion-button>
        </div>
      </form>

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
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
  IonToast,
} from '@ionic/vue'
import { EXPENSE_CATEGORIES, financeApi, type Expense } from '@/api/finance'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name === 'expense-editar')
const id = computed(() => String(route.params.id ?? ''))

const original = reactive<Partial<Expense>>({})
const form = reactive({
  description: '',
  category: '',
  amount: '',
  due_date: '',
  notes: '',
  status: 'pending',
})
const receiptFile = ref<File | null>(null)
const removeReceipt = ref(false)
const errors = ref<Record<string, string[]>>({})
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function err(key: string): string | null {
  return errors.value[key]?.[0] ?? null
}

function detailValue(event: unknown): string {
  const detail = (event as CustomEvent<{ value?: string | number }>)?.detail
  return String(detail?.value ?? '')
}

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (file && file.size > 5 * 1024 * 1024) {
    toast('Arquivo acima de 5 MB.')
    if (input) input.value = ''
    return
  }
  receiptFile.value = file
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await financeApi.expenses({ per_page: 100 })
    const found = (res.data ?? []).find((e) => String(e.id) === id.value)
    if (!found) {
      loadError.value = 'Despesa não encontrada na lista recente.'
      return
    }
    Object.assign(original, found)
    form.description = found.description ?? ''
    form.category = found.category ?? ''
    form.amount = String(found.amount ?? '')
    form.due_date = found.due_date ? found.due_date.slice(0, 10) : ''
    form.notes = found.notes ?? ''
    form.status = found.status ?? 'pending'
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

/** POST (multipart) cria como pending; PUT (multipart) aceita status/remove_receipt. */
async function save() {
  errors.value = {}
  if (!form.description.trim() || !form.amount || !form.due_date || !form.category) {
    toast('Preencha descrição, categoria, valor e vencimento.')
    return
  }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('description', form.description.trim())
    fd.append('category', form.category)
    fd.append('amount', form.amount)
    fd.append('due_date', form.due_date)
    if (form.notes) fd.append('notes', form.notes)
    if (isEdit.value) {
      if (form.status !== original.status) fd.append('status', form.status)
      if (removeReceipt.value) fd.append('remove_receipt', '1')
      if (receiptFile.value) fd.append('receipt', receiptFile.value)
      await financeApi.updateExpense(id.value, fd)
      toast('Despesa atualizada.')
    } else {
      if (receiptFile.value) fd.append('receipt', receiptFile.value)
      await financeApi.createExpense(fd)
      toast('Despesa criada.')
    }
    await router.replace('/financeiro')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    const fields = fieldErrors(e)
    errors.value = fields
    toast(Object.keys(fields).length ? 'Confira os campos destacados.' : apiMessage(e))
  } finally {
    saving.value = false
  }
}

/** PATCH /finance/expenses/{expense}/cancel (idempotente). */
async function cancelExpense() {
  const ok = window.confirm('Cancelar esta despesa?')
  if (!ok) return
  saving.value = true
  try {
    await financeApi.cancelExpense(id.value)
    toast('Despesa cancelada.')
    await router.replace('/financeiro')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card {
  background: var(--ion-card-background);
  border-radius: 13px;
  overflow: hidden;
}
.yz-field {
  margin-top: 16px;
  font-size: 13px;
  color: var(--yz-muted);
}
.yz-field label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}
.yz-field a {
  display: inline-block;
  margin-top: 8px;
}
</style>
