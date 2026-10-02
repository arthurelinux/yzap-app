<!-- NotificationsPanel — destino "Notificações" (GET/PUT /notifications).
  -
  - Página própria do painel (`notifications.edit`, "Notificações do catálogo" /
  - "Mensagens automáticas da loja"): toggles por status + texto por status
  - (≤5000 chars) + tags de mesclagem (`{cliente}`, `{pedido}`…) com toque
  - para inserir no campo focado. Destino SEPARADO de "Conexão WhatsApp"
  - (`?tab=whatsapp`) — no web são itens distintos da navegação, e a API
  - também separa (`/notifications` × `/whatsapp`).
  -
  - Gating: plano pago + permissão `notifications`. 403 de plano vira upgrade
  - inline (distinto de 403 de permissão, que mostra "sem permissão").
-->
<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando mensagens…</p>
  </div>

  <ion-card v-else-if="planBlock">
    <ion-card-content class="ion-text-center upgrade">
      <ion-icon name="diamond-outline" class="big"></ion-icon>
      <h2 class="card-title">Mensagens automáticas no plano {{ planBlock.plan || 'pago' }}</h2>
      <p class="hint">Recurso: {{ planBlock.feature || 'notifications' }}.</p>
      <p class="hint">{{ planBlock.message }}</p>
      <ion-button router-link="/assinatura">Ver planos e assinar</ion-button>
    </ion-card-content>
  </ion-card>

  <template v-else-if="config">
    <ion-card>
      <ion-card-content>
        <div class="row-between">
          <div>
            <h2 class="card-title">Mensagens automáticas</h2>
            <p class="hint" style="margin: 0">
              Enviadas pelo WhatsApp a cada mudança de status do pedido.
            </p>
          </div>
          <ion-badge :color="config.whatsapp.connected ? 'success' : 'warning'">
            WhatsApp {{ config.whatsapp.connected ? 'conectado' : 'desconectado' }}
          </ion-badge>
        </div>
        <p v-if="!config.whatsapp.connected" class="hint">
          Conecte o WhatsApp na
          <router-link :to="{ path: '/configurar-loja', query: { tab: 'whatsapp' } }">
            aba Conexão WhatsApp</router-link
          >
          para as mensagens chegarem ao cliente.
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card v-for="key in statusKeys" :key="key">
      <ion-card-content>
        <ion-item lines="none" class="status-row">
          <ion-label>
            <h3>{{ config.statuses[key] ?? key }}</h3>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="enabled.includes(key)"
            @ionChange="toggleStatus(key, detailChecked($event))"
          ></ion-toggle>
        </ion-item>

        <template v-if="enabled.includes(key)">
          <ion-item lines="full" class="yz-field">
            <ion-textarea
              :ref="(el) => setAreaRef(key, el)"
              :value="messages[key] ?? ''"
              label="Mensagem"
              label-placement="floating"
              :rows="3"
              auto-grow
              :maxlength="5000"
              :counter="true"
              @ionInput="onText(key, detailValue($event))"
              @ionFocus="focusedKey = key"
            />
          </ion-item>
          <p v-if="formErrors[`messages.${key}`]" class="err-text">
            {{ formErrors[`messages.${key}`] }}
          </p>
          <div class="yz-chips tags">
            <ion-chip
              v-for="tag in config.tags"
              :key="tag"
              :disabled="saving"
              @click="insertTag(tag)"
            >{{ tag }}</ion-chip>
          </div>
        </template>
      </ion-card-content>
    </ion-card>

    <div class="save-bar">
      <p v-if="saveError" class="err-text">{{ saveError }}</p>
      <ion-button expand="block" :disabled="saving" @click="save">
        <ion-spinner v-if="saving" name="crescent"></ion-spinner>
        {{ saving ? 'Salvando…' : 'Salvar mensagens' }}
      </ion-button>
    </div>
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
  IonChip,
  IonIcon,
  IonItem,
  IonLabel,
  IonSpinner,
  IonTextarea,
  IonToast,
  IonToggle,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { notificationsApi, type NotificationsConfig } from '@/api/notifications'
import { apiMessage, fieldErrors } from '@/composables/errors'

const emit = defineEmits<{ denied: [] }>()

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const config = ref<NotificationsConfig | null>(null)
const planBlock = ref<{ plan: string | null; feature: string | null; message: string } | null>(null)
const saveError = ref<string | null>(null)
const formErrors = ref<Record<string, string>>({})
const toastOpen = ref(false)
const toastMessage = ref('')

const messages = reactive<Record<string, string>>({})
const enabled = ref<string[]>([])
/** Último campo focado — o toque na tag insere nele (UX touch). */
const focusedKey = ref<string | null>(null)
const areaRefs = new Map<string, unknown>()

const statusKeys = computed(() => (config.value ? Object.keys(config.value.statuses) : []))

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }> | undefined)?.detail
  return Boolean(detail?.checked)
}
function detailValue(event: unknown): string {
  const detail = (event as CustomEvent<{ value?: string | number }> | undefined)?.detail
  return String(detail?.value ?? '')
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function hydrate(data: NotificationsConfig) {
  config.value = data
  for (const key of Object.keys(data.messages)) messages[key] = data.messages[key] ?? ''
  enabled.value = [...data.enabled_statuses]
  if (!focusedKey.value && statusKeys.value.length) focusedKey.value = statusKeys.value[0]
}

function handleForbidden(e: ApiError) {
  if (e.isPlanBlock) {
    planBlock.value = {
      plan: e.body.plan ?? null,
      feature: e.body.feature ?? null,
      message: e.message,
    }
  } else {
    // 403 de permissão em tempo de uso: a aba some (rede de segurança).
    emit('denied')
  }
}

async function load() {
  loading.value = true
  planBlock.value = null
  try {
    const { data } = await notificationsApi.show()
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
    saveError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

function toggleStatus(key: string, on: boolean) {
  enabled.value = on ? [...new Set([...enabled.value, key])] : enabled.value.filter((k) => k !== key)
}

function onText(key: string, value: string) {
  messages[key] = value
}

function setAreaRef(key: string, el: unknown) {
  if (el) areaRefs.set(key, el)
  else areaRefs.delete(key)
}

/** Insere a tag na posição do cursor do campo focado (ou ao final). */
async function insertTag(tag: string) {
  const key = focusedKey.value ?? statusKeys.value[0]
  if (!key) return
  const current = messages[key] ?? ''
  const area = areaRefs.get(key) as { getInputElement?: () => Promise<HTMLTextAreaElement> } | undefined
  let cursor = current.length
  try {
    const native = await area?.getInputElement?.()
    if (native && typeof native.selectionStart === 'number') cursor = native.selectionStart ?? current.length
  } catch {
    /* sem acesso ao cursor: anexa ao final */
  }
  messages[key] = `${current.slice(0, cursor)}${tag}${current.slice(cursor)}`
  focusedKey.value = key
}

async function save() {
  if (!config.value) return
  saving.value = true
  saveError.value = null
  formErrors.value = {}
  try {
    // `messages` é OBRIGATÓRIO e completo (chaves do servidor, não só ativas).
    const full: Record<string, string> = {}
    for (const key of Object.keys(config.value.messages)) full[key] = messages[key] ?? ''
    const updated = await notificationsApi.update({ messages: full, statuses: enabled.value })
    hydrate(updated)
    toast('Mensagens salvas.')
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      handleForbidden(e)
      return
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(fieldErrors(e))) out[k] = v[0] ?? ''
    formErrors.value = out
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.upgrade .big {
  font-size: 3rem;
  color: var(--yz-primary);
  margin-top: 12px;
}
.status-row {
  --padding-start: 0;
  --padding-end: 0;
}
.status-row h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ion-text-color);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.save-bar {
  margin: 4px 0 16px;
}
</style>
