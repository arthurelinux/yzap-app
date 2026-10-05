<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando área de atendimento…</p>
  </div>

  <!-- Gating `delivery_maps` (contrato § Grupo Maps): 403 com plan/feature vira
       upgrade inline (distinto de 403 de permissão), sem sair das configs. -->
  <ion-card v-else-if="planBlock">
    <ion-card-content class="ion-text-center upgrade">
      <ion-icon name="diamond-outline" class="big"></ion-icon>
      <h2 class="card-title">Área de atendimento no plano {{ planBlock.plan || 'pago' }}</h2>
      <p class="hint">Recurso: {{ planBlock.feature || 'delivery_maps' }}.</p>
      <p class="hint">{{ planBlock.message }}</p>
      <ion-button router-link="/assinatura">Ver planos e assinar</ion-button>
    </ion-card-content>
  </ion-card>

  <ion-card v-else-if="denied">
    <ion-card-content class="yz-state" style="padding: 24px 16px">
      <ion-icon name="lock-closed-outline"></ion-icon>
      <h3>Sem permissão</h3>
      <p>Seu usuário não tem acesso à área de atendimento desta loja.</p>
    </ion-card-content>
  </ion-card>

  <template v-else-if="maps">
    <ion-card>
      <ion-card-content>
        <div class="row-between">
          <div>
            <h2 class="card-title">Área de atendimento</h2>
            <p class="hint" style="margin: 0">
              Retirada, entrega e raio — igual à tela do painel web.
            </p>
          </div>
          <ion-badge :color="maps.status_badge.key === 'disabled' ? 'danger' : 'success'">
            {{ maps.status_badge.label }}
          </ion-badge>
        </div>

        <!-- Aviso limpo quando o Maps não está disponível (sem expor chaves). -->
        <p v-if="!maps.maps_api_configured" class="warn-line">
          <ion-icon name="alert-circle-outline"></ion-icon>
          Google Maps não configurado para esta loja — dá para salvar retirada,
          entrega e raio, mas o mapa e a localização automática ficam indisponíveis.
        </p>
        <p v-if="maps.geocode_warning" class="err-line">
          <ion-icon name="alert-circle-outline"></ion-icon>
          {{ maps.geocode_warning }}
        </p>

        <form @submit.prevent="save">
          <h3 class="section-sub">Como a loja atende</h3>
          <ion-item lines="none" class="yz-field">
            <ion-label>
              Aceitar retirada no estabelecimento
              <p class="hint">O cliente faz o pedido e retira no balcão, sem taxa de entrega.</p>
            </ion-label>
            <ion-toggle slot="end" :checked="form.pickup" @ionChange="form.pickup = detailChecked($event)" />
          </ion-item>
          <ion-item lines="none" class="yz-field">
            <ion-label>
              Aceitar entrega
              <p class="hint">Desativado, o checkout só oferecerá retirada no estabelecimento.</p>
            </ion-label>
            <ion-toggle slot="end" :checked="form.delivery" @ionChange="form.delivery = detailChecked($event)" />
          </ion-item>
          <ion-item lines="none" class="yz-field">
            <ion-label>
              Limitar entregas por raio
              <p class="hint">Ativado, o cliente só fecha o pedido para entrega dentro do raio.</p>
            </ion-label>
            <ion-toggle slot="end" :checked="form.limitRadius" @ionChange="form.limitRadius = detailChecked($event)" />
          </ion-item>

          <h3 class="section-sub">Raio de entrega</h3>
          <ion-range
            :value="form.radius"
            :min="0.1"
            :max="100"
            :step="0.1"
            :pin="true"
            @ionInput="onRange"
          ></ion-range>
          <div class="radius-row">
            <ion-input
              type="number"
              :min="0.1"
              :max="100"
              step="0.1"
              :value="form.radius"
              @ionInput="onNumber"
            ></ion-input>
            <span class="hint">km (entre 0,1 e 100 km)</span>
          </div>

          <div class="maps-info">
            <h3 class="section-sub" style="margin-top: 0">Endereço da loja</h3>
            <p class="addr">{{ maps.store_address || 'Endereço não informado.' }}</p>
            <p class="hint">{{ originText }}</p>
            <ion-button size="small" fill="outline" :disabled="saving" @click="useStoreAddress">
              <ion-icon slot="start" name="locate-outline"></ion-icon>
              {{ saving ? 'Aplicando…' : 'Usar endereço da loja' }}
            </ion-button>
            <p class="hint">
              Recalcula a origem a partir do endereço da aba Identidade
              (geocodifica no servidor ao salvar).
            </p>
          </div>

          <p v-if="formError" class="err-text">{{ formError }}</p>
          <ion-button expand="block" type="submit" :disabled="saving">
            {{ saving ? 'Salvando…' : 'Salvar configuração' }}
          </ion-button>
        </form>
      </ion-card-content>
    </ion-card>

    <!-- Círculo do raio desenhado no cliente a partir de origin + maps_radius_km.
         Mapa nativo é fase futura: fallback em CSS + texto (raio + endereço). -->
    <ion-card v-if="maps.radius_active && maps.origin">
      <ion-card-content class="ion-text-center">
        <h2 class="card-title">Visualização da área de entrega</h2>
        <div
          class="radius-viz"
          role="img"
          :aria-label="`Raio de ${radiusLabel} a partir do endereço da loja`"
        >
          <div class="radius-circle">
            <ion-icon name="storefront-outline"></ion-icon>
          </div>
        </div>
        <p class="radius-label">{{ radiusLabel }} a partir do endereço da loja</p>
        <p class="hint">{{ maps.store_address }}</p>
      </ion-card-content>
    </ion-card>
    <ion-card v-else>
      <ion-card-content class="yz-state" style="padding: 24px 16px">
        <ion-icon name="map-outline"></ion-icon>
        <h3>Sem raio ativo</h3>
        <p>
          Ative a entrega com limite por raio para visualizar a área de atendimento
          aqui.
        </p>
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRange,
  IonSpinner,
  IonToast,
  IonToggle,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { mapsApi, type MapsInfo } from '@/api/maps'
import { apiMessage } from '@/composables/errors'

const router = useRouter()

const maps = ref<MapsInfo | null>(null)
const loading = ref(true)
/** 403 de plano (com plan/feature) — distinto de 403 de permissão. */
const planBlock = ref<{ plan: string | null; feature: string | null; message: string } | null>(null)
/** 403 de permissão (sem plan/feature). */
const denied = ref(false)
const saving = ref(false)
const formError = ref<string | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

const form = reactive({ pickup: true, delivery: true, limitRadius: false, radius: 10 })

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }> | undefined)?.detail
  return Boolean(detail?.checked)
}

function hydrate(data: MapsInfo) {
  maps.value = data
  form.pickup = data.pickup_enabled
  form.delivery = data.delivery_enabled
  form.limitRadius = data.maps_enabled
  form.radius = typeof data.maps_radius_km === 'number' ? data.maps_radius_km : 10
}

const originText = computed(() => {
  const o = maps.value?.origin
  if (o && typeof o.latitude === 'number' && typeof o.longitude === 'number') {
    return `Coordenadas atuais: ${o.latitude}, ${o.longitude}`
  }
  return 'Coordenadas atuais: ainda não definidas.'
})

const radiusLabel = computed(() => {
  const r = Number(form.radius)
  if (!Number.isFinite(r)) return '— km'
  return `${r.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km`
})

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function onRange(event: unknown) {
  const value = (event as CustomEvent<{ value?: number }> | undefined)?.detail?.value
  if (typeof value === 'number' && Number.isFinite(value)) form.radius = Math.round(value * 10) / 10
}

function onNumber(event: unknown) {
  const value = (event as CustomEvent<{ value?: string }> | undefined)?.detail?.value
  const parsed = Number(value)
  if (Number.isFinite(parsed)) form.radius = parsed
}

/** Validação espelhando os 422 do contrato (antes do PUT). */
function validate(): string | null {
  if (!form.pickup && !form.delivery) return 'Ative ao menos a retirada ou a entrega.'
  if (form.limitRadius && !form.delivery) return 'Para limitar por raio, ative a entrega.'
  if (form.limitRadius && (!Number.isFinite(form.radius) || form.radius < 0.1 || form.radius > 100)) {
    return 'Informe um raio entre 0,1 e 100 km.'
  }
  return null
}

function handleForbidden(e: ApiError) {
  if (e.isPlanBlock) {
    planBlock.value = {
      plan: e.body.plan ?? null,
      feature: e.body.feature ?? null,
      message: e.message,
    }
  } else {
    denied.value = true
  }
}

async function load() {
  loading.value = true
  planBlock.value = null
  denied.value = false
  try {
    const { data } = await mapsApi.get()
    hydrate(data)
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      handleForbidden(e)
      return
    }
    formError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  formError.value = null
  const invalid = validate()
  if (invalid) {
    formError.value = invalid
    return
  }
  saving.value = true
  try {
    // Sem coordenadas: o servidor geocodifica o endereço da loja (contrato).
    const updated = await mapsApi.update({
      pickup_enabled: form.pickup,
      delivery_enabled: form.delivery,
      maps_enabled: form.limitRadius,
      maps_radius_km: Math.round(form.radius * 100) / 100,
    })
    hydrate(updated)
    toast('Configuração salva')
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      handleForbidden(e)
      return
    }
    formError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

/**
 * "Usar endereço da loja": salva sem coordenadas para o servidor
 * (re)geocodificar o endereço atual da aba Identidade. Sem chave no servidor
 * e sem origem resolvida, cai no 422 limpo do contrato (nunca 500).
 */
async function useStoreAddress() {
  await save()
  if (!formError.value) toast('Origem recalculada a partir do endereço da loja')
}

/**
 * A aba chama `refresh()` ao ser ativada (com `force` após salvar endereço em
 * Identidade — o PUT /store/settings descarta as coordenadas e o GET /maps
 * recalcula). Não recarrega edições não salvas à toa.
 */
let loadedOnce = false
async function refresh(force = false) {
  if (!loadedOnce || force) {
    await load()
    loadedOnce = true
  }
}

defineExpose({ refresh })

onMounted(() => {
  void refresh()
})
</script>

<style scoped>
.upgrade .big {
  font-size: 3rem;
  color: var(--yz-accent-ink);
  margin-top: 12px;
}
.warn-line,
.err-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  border-radius: var(--yz-radius-sm);
  padding: 10px 12px;
  margin: 12px 0 0;
}
.warn-line {
  color: var(--ion-text-color);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.4);
}
.err-line {
  color: var(--ion-color-danger);
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.35);
}
.warn-line ion-icon,
.err-line ion-icon {
  font-size: 1.2rem;
  flex: none;
  margin-top: 1px;
}
.section-sub {
  margin: 18px 0 6px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ion-text-color);
}
.radius-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.radius-row ion-input {
  border: 1px solid var(--yz-mist);
  border-radius: 8px;
  --padding-start: 10px;
  max-width: 110px;
  color: var(--ion-text-color);
}
.maps-info {
  border: 1px solid var(--yz-mist);
  border-radius: var(--yz-radius-md);
  padding: 12px;
  margin: 16px 0;
}
.maps-info .addr {
  margin: 0 0 4px;
  color: var(--ion-text-color);
}
/* Fallback sem chave de mapa: círculo CSS + texto (raio + endereço).
 * Cores só por vars do tema: legível no light e no dark. */
.radius-viz {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 0 10px;
}
.radius-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 2px dashed var(--ion-color-primary);
  background: rgba(8, 127, 111, 0.1);
  background: color-mix(in srgb, var(--ion-color-primary) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.radius-circle ion-icon {
  font-size: 2rem;
  color: var(--ion-color-primary);
}
.radius-label {
  font-weight: 800;
  margin: 4px 0;
  color: var(--ion-text-color);
}
</style>
