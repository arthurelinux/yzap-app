<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Planos" sub="Administração" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando planos…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="diamond-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="plans.length" lines="full" class="card">
          <ion-item
            v-for="plan in plans"
            :key="plan.id"
            :button="true"
            detail
            @click="edit(plan)"
          >
            <ion-label>
              <h3>
                {{ plan.name }}
                <ion-badge :color="plan.is_active === false ? 'medium' : 'success'">
                  {{ plan.is_active === false ? 'inativo' : 'ativo' }}
                </ion-badge>
                <ion-badge v-if="plan.is_free" color="medium">gratuito</ion-badge>
              </h3>
              <p>
                {{ price(plan.prices?.monthly) }}/mês ·
                {{ plan.limits?.max_products ?? '—' }} produtos ·
                {{ plan.limits?.max_users ?? '—' }} usuários
                <template v-if="plan.features?.finance"> · financeiro</template>
                <template v-if="plan.features?.stock"> · estoque</template>
                <template v-if="plan.features?.delivery_maps"> · maps</template>
              </p>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="diamond-outline"></ion-icon>
          <h3>Nenhum plano</h3>
          <p>Crie o primeiro plano.</p>
        </div>

        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button @click="create">
            <ion-icon name="add-outline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </template>

      <!-- Sheet de edição (POST cria, PATCH atualiza, DELETE remove). -->
      <ion-modal :is-open="sheetOpen" @did-dismiss="sheetOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ form.id ? 'Editar plano' : 'Novo plano' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="sheetOpen = false">Fechar</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">Nome</ion-label>
              <ion-input v-model="form.name" placeholder="Profissional"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Preço mensal</ion-label>
              <ion-input v-model="form.price_monthly" type="number" :min="0" placeholder="49,90"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Preço semestral</ion-label>
              <ion-input v-model="form.price_semiannual" type="number" :min="0" placeholder="299,90"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Preço anual</ion-label>
              <ion-input v-model="form.price_annual" type="number" :min="0" placeholder="499,90"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Máx. produtos</ion-label>
              <ion-input v-model="form.max_products" type="number" :min="0"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Máx. categorias</ion-label>
              <ion-input v-model="form.max_categories" type="number" :min="0"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Máx. usuários</ion-label>
              <ion-input v-model="form.max_users" type="number" :min="0"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>Financeiro</ion-label>
              <ion-toggle
                :checked="form.finance"
                @ionChange="form.finance = detailChecked($event)"
              ></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-label>Estoque</ion-label>
              <ion-toggle
                :checked="form.stock"
                @ionChange="form.stock = detailChecked($event)"
              ></ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-label>Ativo</ion-label>
              <ion-toggle
                :checked="form.is_active"
                @ionChange="form.is_active = detailChecked($event)"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <div class="yz-actions">
            <ion-button :disabled="saving" @click="save">
              <ion-spinner v-if="saving" name="crescent"></ion-spinner>
              Salvar
            </ion-button>
            <ion-button
              v-if="form.id && !form.is_free"
              fill="outline"
              color="danger"
              :disabled="saving"
              @click="remove"
            >
              Excluir
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToast,
  IonToolbar,
} from '@ionic/vue'
import { adminApi, type AdminPlan } from '@/api/admin'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const plans = ref<AdminPlan[]>([])
const loading = ref(true)
const saving = ref(false)
const sheetOpen = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const form = reactive({
  id: null as number | null,
  name: '',
  price_monthly: '',
  price_semiannual: '',
  price_annual: '',
  max_products: '',
  max_categories: '',
  max_users: '',
  finance: false,
  stock: false,
  is_active: true,
  is_free: false,
})

function price(value?: string | null): string {
  const n = Number(value ?? 0)
  try {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value ?? 0)
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }>)?.detail
  return Boolean(detail?.checked)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await adminApi.plans()
    plans.value = data ?? []
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

function create() {
  Object.assign(form, {
    id: null,
    name: '',
    price_monthly: '',
    price_semiannual: '',
    price_annual: '',
    max_products: '',
    max_categories: '',
    max_users: '',
    finance: false,
    stock: false,
    is_active: true,
    is_free: false,
  })
  sheetOpen.value = true
}

function edit(plan: AdminPlan) {
  Object.assign(form, {
    id: plan.id,
    name: plan.name,
    price_monthly: plan.prices?.monthly ?? '',
    price_semiannual: plan.prices?.semiannual ?? '',
    price_annual: plan.prices?.annual ?? '',
    max_products: plan.limits?.max_products ?? '',
    max_categories: plan.limits?.max_categories ?? '',
    max_users: plan.limits?.max_users ?? '',
    finance: Boolean(plan.features?.finance),
    stock: Boolean(plan.features?.stock),
    is_active: plan.is_active !== false,
    is_free: Boolean(plan.is_free),
  })
  sheetOpen.value = true
}

function body(): Record<string, unknown> {
  const payload: Record<string, unknown> = { name: form.name.trim(), is_active: form.is_active }
  // Plano `free` não aceita preços (422) — só enviamos se houver valor.
  if (!form.is_free) {
    if (form.price_monthly !== '') payload.price_monthly = Number(form.price_monthly)
    if (form.price_semiannual !== '') payload.price_semiannual = Number(form.price_semiannual)
    if (form.price_annual !== '') payload.price_annual = Number(form.price_annual)
  }
  if (form.max_products !== '') payload.max_products = Number(form.max_products)
  if (form.max_categories !== '') payload.max_categories = Number(form.max_categories)
  if (form.max_users !== '') payload.max_users = Number(form.max_users)
  payload.features = { finance: form.finance, stock: form.stock }
  return payload
}

async function save() {
  if (!form.name.trim()) {
    toast('Informe o nome do plano.')
    return
  }
  saving.value = true
  try {
    if (form.id) {
      const { data } = await adminApi.updatePlan(form.id, body())
      const i = plans.value.findIndex((p) => p.id === form.id)
      if (i >= 0) plans.value[i] = data
    } else {
      const { data } = await adminApi.createPlan(body())
      plans.value.push(data)
    }
    sheetOpen.value = false
    toast('Plano salvo.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

/** DELETE — `free` ou plano com usuários/pagamentos: 422 (aviso honesto). */
async function remove() {
  if (!form.id) return
  saving.value = true
  try {
    await adminApi.removePlan(form.id)
    plans.value = plans.value.filter((p) => p.id !== form.id)
    sheetOpen.value = false
    toast('Plano excluído.')
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
.card ion-badge {
  margin-left: 8px;
  vertical-align: middle;
}
</style>
