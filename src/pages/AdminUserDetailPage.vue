<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead :title="user.name || 'Usuário'" sub="Administração · usuário" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando usuário…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="person-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list lines="full" class="card">
          <ion-item>
            <ion-label>
              <h3>{{ user.email }}</h3>
              <p>
                Plano atual: {{ user.plan?.name || 'nenhum' }}
                <template v-if="user.access_expires_at">
                  · expira {{ date(user.access_expires_at) }}
                </template>
              </p>
            </ion-label>
          </ion-item>
          <ion-item v-if="user.owned_store">
            <ion-label>
              <p>Loja: {{ user.owned_store.name }} ({{ user.owned_store.slug }})</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <h3>Conta ativa</h3>
              <p v-if="user.is_super_admin">Super-admin não pode ser desativado por aqui (422).</p>
              <p v-else-if="!user.is_active && !user.access_expires_at">
                Ativar exige acesso vigente — use "Conceder acesso" abaixo.
              </p>
            </ion-label>
            <ion-toggle
              :checked="user.is_active === true"
              :disabled="Boolean(user.is_super_admin)"
              @ionChange="setActive(detailChecked($event))"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <ion-list lines="full" class="card grant">
          <ion-item>
            <ion-label position="stacked">Conceder acesso — plano</ion-label>
            <ion-select
              v-model="grant.plan_id"
              placeholder="Escolha o plano"
              interface="action-sheet"
            >
              <ion-select-option
                v-for="plan in paidPlans"
                :key="plan.id"
                :value="plan.id"
              >
                {{ plan.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Período</ion-label>
            <ion-select v-model="grant.period" interface="action-sheet">
              <ion-select-option value="monthly">Mensal</ion-select-option>
              <ion-select-option value="semiannual">Semestral</ion-select-option>
              <ion-select-option value="annual">Anual</ion-select-option>
              <ion-select-option value="custom">Personalizado (dias)</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item v-if="grant.period === 'custom'">
            <ion-label position="stacked">Dias (1–365)</ion-label>
            <ion-input
              v-model="grant.custom_days"
              type="number"
              :min="1"
              :max="365"
              placeholder="30"
            ></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-button
              size="small"
              :disabled="!grant.plan_id || granting"
              @click="doGrant"
            >
              <ion-spinner v-if="granting" name="crescent"></ion-spinner>
              Conceder
            </ion-button>
          </ion-item>
        </ion-list>

        <div class="yz-meta" v-if="granted">
          <strong>Acesso concedido:</strong> {{ granted.plan }} · {{ granted.period }} ·
          válido até {{ date(granted.expires_at) }}
        </div>
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
  IonToggle,
  IonToast,
} from '@ionic/vue'
import { adminApi, type AdminPlan, type AdminUser, type GrantAccessResult } from '@/api/admin'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const user = reactive<Partial<AdminUser>>({})
const plans = ref<AdminPlan[]>([])
const grant = reactive<{ plan_id: number | null; period: string; custom_days: string }>({
  plan_id: null,
  period: 'monthly',
  custom_days: '',
})
const granted = ref<GrantAccessResult['granted'] | null>(null)
const loading = ref(true)
const granting = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

// Contrato: grant-access recusa plano inativo/gratuito com 422 — só pagos.
const paidPlans = computed(() => plans.value.filter((p) => !p.is_free))

function date(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('pt-BR')
  } catch {
    return value
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
    const [u, p] = await Promise.all([adminApi.user(id), adminApi.plans()])
    Object.assign(user, u.data)
    plans.value = p.data ?? []
    grant.plan_id = paidPlans.value[0]?.id ?? null
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

/** PATCH {"is_active": bool} — erros 422 saem em toast (super-admin / sem acesso). */
async function setActive(next: boolean) {
  if (user.is_active === next) return
  try {
    const { data } = await adminApi.setUserActive(id, next)
    Object.assign(user, data)
    toast(next ? 'Usuário ativado.' : 'Usuário desativado.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  }
}

async function doGrant() {
  if (!grant.plan_id) return
  granting.value = true
  try {
    const body: { plan_id: number; period?: string; custom_days?: number } = {
      plan_id: grant.plan_id,
      period: grant.period,
    }
    if (grant.period === 'custom') body.custom_days = Number(grant.custom_days)
    const { data } = await adminApi.grantAccess(id, body)
    granted.value = data.granted ?? null
    Object.assign(user, data)
    toast('Acesso concedido.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    granting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card {
  background: var(--yz-card);
  border-radius: 13px;
  overflow: hidden;
  margin-bottom: 14px;
}
.grant ion-button {
  margin-top: 10px;
}
.yz-meta {
  margin-top: 14px;
  font-size: 13px;
  color: var(--yz-muted);
  line-height: 1.7;
}
</style>
