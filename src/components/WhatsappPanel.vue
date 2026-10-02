<!-- WhatsappPanel — destino "Conexão WhatsApp" (GET /whatsapp +
  - POST /whatsapp/sync-qr). Destino PRÓPRIO, separado de "Notificações"
  - (mensagens automáticas, `NotificationsPanel` em aba própria com
  - `?tab=notificacoes`) — no painel são páginas distintas
  - (`whatsapp.edit` × `notifications.edit`), e a API também separa
  - (`/whatsapp` × `/notifications`).
  -
  - Espelha `resources/views/catalog/admin/whatsapp.blade.php` + o polling de
  - `public/assets/js/catalog/admin/whatsapp.js` (repo Laravel irmão): após o
  - sync, enquanto não conectar, repete o sync a cada 5s (pausa com a aba
  - oculta, ignora sobreposição, mostra aviso após 3 falhas, para ao conectar
  - e esconde o QR — igual ao painel).
  -
  - SEGREDO: a API nunca devolve tokens da Evolution — esta tela só mostra
  - status + QR. O nome da instância é editável só na 1ª conexão (sugerido o
  - slug da loja, como no painel) e vira somente-leitura depois.
  -
  - Gating: leitura exige permissão `notifications` (403 → `denied`, aba some);
  - o sync exige plano pago (403 de plano vira upgrade inline, sem sair da aba).
-->
<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando conexão…</p>
  </div>

  <template v-else>
    <ion-card>
      <ion-card-content>
        <h2 class="card-title">Conexão WhatsApp</h2>
        <p class="hint" style="margin-top: -4px">
          Use o celular que receberá os pedidos e as mensagens automáticas do catálogo.
        </p>

        <!-- Guia condensado do painel (evita o erro "Não é possível conectar"). -->
        <ol class="guide">
          <li>Use um aparelho dedicado, com WhatsApp atualizado e internet estável.</li>
          <li>Não reutilize número já ligado a outra instância: desconecte a sessão anterior.</li>
          <li>No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho.</li>
          <li>Deixe esta tela aberta até aparecer “Conectado”.</li>
        </ol>

        <ion-item lines="full" class="yz-field">
          <ion-input
            v-model="instanceName"
            label="Nome da instância"
            label-placement="floating"
            :readonly="hasInstance"
            :maxlength="60"
            :placeholder="slugHint"
          />
        </ion-item>
        <p v-if="!hasInstance" class="hint">Sugerimos o endereço da sua loja: {{ slugHint }}.</p>
        <p v-if="nameError" class="err-text">{{ nameError }}</p>

        <p v-if="formError" class="err-text" role="alert">{{ formError }}</p>
        <div class="yz-actions">
          <ion-button :disabled="syncing" @click="sync">
            <ion-spinner v-if="syncing" name="crescent"></ion-spinner>
            {{
              syncing
                ? 'Sincronizando…'
                : hasInstance
                  ? 'Gerar novo QR e sincronizar'
                  : 'Criar instância e gerar QR'
            }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Upgrade inline: o sync exige plano pago; a leitura continua visível. -->
    <ion-card v-if="planBlock">
      <ion-card-content class="ion-text-center upgrade">
        <ion-icon name="diamond-outline" class="big"></ion-icon>
        <h2 class="card-title">Sincronizar QR no plano {{ planBlock.plan || 'pago' }}</h2>
        <p class="hint">Recurso: {{ planBlock.feature || 'sync-qr' }}.</p>
        <p class="hint">{{ planBlock.message }}</p>
        <ion-button router-link="/assinatura">Ver planos e assinar</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-if="status">
      <ion-card-content>
        <div class="row-between">
          <div>
            <p class="hint" style="margin: 0">Instância</p>
            <h3 class="instance">{{ status.instance_name }}</h3>
          </div>
          <ion-badge :color="badgeColor">{{ statusLabel }}</ion-badge>
        </div>
        <p class="hint">Conectada em: {{ connectedAtLabel }}</p>

        <div v-if="status.connected" class="connected-note">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <p>
            WhatsApp conectado. As mensagens automáticas ficam na
            <router-link :to="{ path: '/configurar-loja', query: { tab: 'notificacoes' } }">
              aba Notificações</router-link
            >.
          </p>
        </div>

        <template v-else-if="status.qr_code">
          <img :src="status.qr_code" alt="QR code do WhatsApp" class="qr" />
          <p class="hint">
            Abra o WhatsApp no celular e escaneie o código. Ele é atualizado
            automaticamente enquanto esta tela estiver aberta.
          </p>
        </template>
        <template v-else-if="hasInstance">
          <p class="hint">Sem QR no momento — toque em “Gerar novo QR e sincronizar”.</p>
        </template>

        <p v-if="pollFeedback" class="hint" role="status">{{ pollFeedback }}</p>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  IonToast,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { whatsappApi, whatsappStatusLabel, type WhatsappStatus } from '@/api/whatsapp'
import { apiMessage, fieldErrors } from '@/composables/errors'
import { useShopStore } from '@/stores/shop'

const emit = defineEmits<{ denied: [] }>()

const router = useRouter()
const shop = useShopStore()

const loading = ref(true)
const syncing = ref(false)
const status = ref<WhatsappStatus | null>(null)
const hasInstance = ref(false)
const instanceName = ref('')
const nameError = ref<string | null>(null)
const formError = ref<string | null>(null)
const planBlock = ref<{ plan: string | null; feature: string | null; message: string } | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

/* ---------- Polling igual ao painel (whatsapp.js: 5s, sem sobrepor) ---------- */
const pollFeedback = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
let polling = false
let failures = 0
let previousStatus = ''

const slugHint = computed(() => (shop.store?.slug ?? 'minha-loja').slice(0, 60))
const hasStatus = computed(() => status.value !== null)
const statusLabel = computed(() => whatsappStatusLabel(status.value?.status))
const badgeColor = computed(() => {
  if (status.value?.connected) return 'success'
  if (status.value?.status === 'connecting') return 'warning'
  return 'danger'
})
const connectedAtLabel = computed(() => {
  const iso = status.value?.connected_at
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
})

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  polling = false
}

function startPolling() {
  stopPolling()
  failures = 0
  previousStatus = status.value?.status ?? ''
  // Igual ao painel: repete o sync a cada 5s até conectar.
  pollTimer = setInterval(async () => {
    if (polling || document.hidden || !hasStatus.value || status.value?.connected) return
    polling = true
    try {
      const next = await whatsappApi.syncQr()
      failures = 0
      pollFeedback.value = ''
      applyStatus(next)
      const becameConnected = next.connected && previousStatus !== 'connected'
      previousStatus = next.status
      if (next.connected) {
        stopPolling()
        if (becameConnected) {
          toast('WhatsApp conectado.')
        }
      }
    } catch {
      failures += 1
      pollFeedback.value =
        failures > 2
          ? 'Conexão instável com o servidor. Continuaremos tentando automaticamente.'
          : 'Atualizando conexão…'
    } finally {
      polling = false
    }
  }, 5000)
}

function applyStatus(next: WhatsappStatus) {
  status.value = next
  hasInstance.value = true
}

async function load() {
  loading.value = true
  formError.value = null
  try {
    if (!shop.store) {
      try {
        await shop.load()
      } catch {
        /* segue com o slug genérico */
      }
    }
    const { data } = await whatsappApi.show()
    applyStatus(data)
    instanceName.value = data.instance_name
    if (!data.connected) startPolling()
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      emit('denied')
      return
    }
    if (e instanceof ApiError && e.status === 404) {
      // Sem instância: mostra o form de criação (como o painel).
      hasInstance.value = false
      instanceName.value = slugHint.value
      return
    }
    formError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

function validName(value: string): string | null {
  const name = value.trim()
  if (!hasInstance.value && !name) return 'Informe o nome da instância.'
  if (name && (name.length < 3 || name.length > 60)) return 'Use de 3 a 60 caracteres.'
  if (name && !/^[A-Za-z0-9_-]+$/.test(name))
    return 'Use apenas letras, números, underline ou hífen.'
  return null
}

async function sync() {
  nameError.value = null
  formError.value = null
  planBlock.value = null
  if (!hasInstance.value) {
    const invalid = validName(instanceName.value)
    if (invalid) {
      nameError.value = invalid
      return
    }
  }
  syncing.value = true
  try {
    const next = await whatsappApi.syncQr(hasInstance.value ? undefined : instanceName.value.trim())
    applyStatus(next)
    instanceName.value = next.instance_name
    if (next.connected) {
      stopPolling()
      toast('WhatsApp conectado.')
    } else {
      startPolling()
      if (!next.qr_code) toast('Instância sincronizada.')
    }
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      if (e.isPlanBlock) {
        // Sync exige plano pago: upgrade inline, leitura preservada.
        planBlock.value = {
          plan: e.body.plan ?? null,
          feature: e.body.feature ?? null,
          message: e.message,
        }
      } else {
        emit('denied')
      }
      return
    }
    if (e instanceof ApiError && e.status === 503) {
      formError.value = `${apiMessage(e)} Toque para tentar de novo.`
      return
    }
    nameError.value = fieldErrors(e)['instance_name']?.[0] ?? null
    formError.value = apiMessage(e)
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  void load()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.upgrade .big {
  font-size: 3rem;
  color: var(--yz-primary);
  margin-top: 12px;
}
.guide {
  margin: 10px 0 14px;
  padding-left: 20px;
  font-size: 0.85rem;
  color: var(--ion-text-color);
  display: grid;
  gap: 6px;
}
.instance {
  margin: 0;
  font-size: 1.05rem;
  color: var(--ion-text-color);
}
.qr {
  display: block;
  width: min(100%, 260px);
  height: auto;
  margin: 12px auto 8px;
  border-radius: var(--yz-radius-md);
  border: 1px solid var(--yz-mist);
  background: #fff;
}
.connected-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--yz-radius-sm);
  background: rgba(8, 127, 111, 0.1);
  border: 1px solid rgba(8, 127, 111, 0.35);
}
.connected-note ion-icon {
  font-size: 1.3rem;
  color: var(--yz-primary);
  flex: none;
}
.connected-note p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ion-text-color);
}
</style>
