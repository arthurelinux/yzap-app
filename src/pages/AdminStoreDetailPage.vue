<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead :title="store.name || 'Loja'" sub="Administração · loja" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando loja…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="storefront-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list lines="full" class="card">
          <ion-item>
            <ion-label position="stacked">Nome</ion-label>
            <ion-input v-model="form.name" placeholder="Nome da loja"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Slug</ion-label>
            <ion-input v-model="form.slug" placeholder="minha-loja"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Segmento (sector)</ion-label>
            <ion-input v-model="form.sector" placeholder="ex.: restaurante"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">WhatsApp</ion-label>
            <ion-input v-model="form.whatsapp" placeholder="11999998888"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Cor de destaque</ion-label>
            <ion-input v-model="form.accent_color" placeholder="#087f6f"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Descrição</ion-label>
            <ion-textarea v-model="form.description" :rows="3" auto-grow></ion-textarea>
          </ion-item>
          <ion-item lines="none">
            <ion-label>Loja publicada</ion-label>
            <ion-toggle
              :checked="form.is_published"
              @ionChange="form.is_published = detailChecked($event)"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <div class="yz-meta" v-if="store.owner">
          <strong>Titular:</strong> {{ store.owner.name }} ({{ store.owner.email }})<br />
          <strong>Plano:</strong> {{ store.owner.plan || 'sem plano' }} ·
          <strong>Acesso:</strong> {{ store.owner.access_expires_at || '—' }}<br />
          <strong>Produtos:</strong> {{ store.products_count ?? 0 }} ·
          <strong>Criada em:</strong> {{ date(store.created_at) }}
        </div>

        <div class="yz-field">
          <label>Logo</label>
          <input type="file" accept="image/*" @change="pickFile('logo', $event)" />
          <ion-img v-if="store.logo_url" :src="store.logo_url" class="thumb"></ion-img>
        </div>

        <div class="yz-actions">
          <ion-button :disabled="saving" @click="save">
            <ion-spinner v-if="saving" name="crescent"></ion-spinner>
            Salvar alterações
          </ion-button>
        </div>
      </template>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2400"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton,
  IonContent,
  IonIcon,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonTextarea,
  IonToggle,
  IonToast,
} from '@ionic/vue'
import { adminApi, type AdminStore } from '@/api/admin'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const store = reactive<Partial<AdminStore>>({})
const form = reactive({
  name: '',
  slug: '',
  sector: '',
  whatsapp: '',
  accent_color: '',
  description: '',
  is_published: true,
})
const logoFile = ref<File | null>(null)
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

function date(value?: string): string {
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

function pickFile(kind: 'logo', event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (kind === 'logo') logoFile.value = file
}

/** Helpers tipados p/ eventos Ionic (detail checked/value). */
function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }>)?.detail
  return Boolean(detail?.checked)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await adminApi.store(id)
    Object.assign(store, data)
    form.name = data.name ?? ''
    form.slug = data.slug ?? ''
    form.sector = data.sector ?? ''
    form.whatsapp = data.whatsapp ?? ''
    form.accent_color = data.accent_color ?? ''
    form.description = data.description ?? ''
    form.is_published = data.is_published !== false
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    // PATCH multipart parcial (grupo 4 do contrato): só o que o usuário mexeu.
    const fd = new FormData()
    if (form.name.trim() && form.name !== store.name) fd.append('name', form.name.trim())
    if (form.slug.trim() && form.slug !== store.slug) fd.append('slug', form.slug.trim())
    if (form.sector !== (store.sector ?? '')) fd.append('sector', form.sector)
    if (form.whatsapp !== (store.whatsapp ?? '')) fd.append('whatsapp', form.whatsapp)
    if (form.accent_color !== (store.accent_color ?? '')) fd.append('accent_color', form.accent_color)
    if (form.description !== (store.description ?? '')) fd.append('description', form.description)
    if (form.is_published !== (store.is_published !== false)) {
      fd.append('is_published', form.is_published ? '1' : '0')
    }
    if (logoFile.value) fd.append('logo', logoFile.value)

    if ([...fd.keys()].length === 0) {
      toast('Nada para salvar.')
      return
    }
    const { data } = await adminApi.updateStore(id, fd)
    Object.assign(store, data)
    logoFile.value = null
    toast('Loja atualizada.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    const fields = fieldErrors(e)
    toast(Object.keys(fields).length ? `Confira: ${Object.keys(fields).join(', ')}` : apiMessage(e))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card {
  background: var(--yz-card);
  border-radius: 13px;
  overflow: hidden;
}
.yz-meta {
  margin-top: 14px;
  font-size: 13px;
  color: var(--yz-muted);
  line-height: 1.7;
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
.thumb {
  max-width: 140px;
  margin-top: 8px;
  border-radius: 10px;
}
</style>
