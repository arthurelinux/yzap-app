<!-- BannersPanel — aba Banners do painel (GET/POST /appearance/banners,
  - PUT /appearance/banners/hero + PUT/DELETE /appearance/banners/{banner}).
  -
  - Imagem do novo banner via `FileUploader` (5 MB, sem recorte — o painel só
  - valida e grava). Edição altera título/link/ativo (JSON); a imagem não tem
  - endpoint de troca — para trocar, exclua e crie de novo.
  -
  - ATENÇÃO herdada do backend: o PUT do banner aplica `boolean('is_active')`
  - em toda edição — o app envia SEMPRE o valor atual junto.
  -
  - Gating: grupo SEM plano pago (só `store_theme`). 403 → `denied` (aba some).
-->
<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando banners…</p>
  </div>

  <template v-else>
    <ion-card>
      <ion-card-content>
        <ion-item lines="none" class="hero-row">
          <ion-label>
            <h3>Exibir destaque na vitrine</h3>
            <p class="hint">Mostra o bloco de destaque no topo da loja pública.</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="showHero"
            :disabled="heroBusy"
            @ionChange="saveHero(detailChecked($event))"
          ></ion-toggle>
        </ion-item>
        <p v-if="heroError" class="err-text">{{ heroError }}</p>
      </ion-card-content>
    </ion-card>

    <ion-card v-if="!banners.length">
      <ion-card-content class="yz-state" style="padding: 24px 16px">
        <ion-icon name="images-outline"></ion-icon>
        <h3>Nenhum banner ainda</h3>
        <p>Adicione o primeiro banner da vitrine abaixo.</p>
      </ion-card-content>
    </ion-card>

    <ion-card v-for="banner in banners" :key="banner.id">
      <ion-card-content>
        <div class="banner-row">
          <img
            v-if="banner.image_url"
            :src="banner.image_url"
            :alt="banner.title || 'Banner da vitrine'"
            class="banner-thumb"
            loading="lazy"
          />
          <div class="banner-info">
            <h3>{{ banner.title || 'Sem título' }}</h3>
            <p v-if="banner.link_url" class="hint link">{{ banner.link_url }}</p>
            <ion-badge :color="banner.is_active ? 'success' : 'medium'">
              {{ banner.is_active ? 'ativo' : 'inativo' }}
            </ion-badge>
          </div>
          <div class="banner-actions">
            <ion-button size="small" fill="clear" @click="startEdit(banner)">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-button>
            <ion-button
              size="small"
              fill="clear"
              color="danger"
              :disabled="removingId === banner.id"
              @click="askRemove(banner)"
            >
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-button>
          </div>
        </div>

        <div v-if="editingId === banner.id" class="edit-box">
          <ion-item lines="full" class="yz-field">
            <ion-input v-model="editForm.title" label="Título" label-placement="floating" :maxlength="120" />
          </ion-item>
          <p v-if="editErrors.title" class="err-text">{{ editErrors.title }}</p>
          <ion-item lines="full" class="yz-field">
            <ion-input
              v-model="editForm.link_url"
              label="Link (http/https)"
              label-placement="floating"
              inputmode="url"
              :maxlength="255"
            />
          </ion-item>
          <p v-if="editErrors.link_url" class="err-text">{{ editErrors.link_url }}</p>
          <ion-item lines="none" class="yz-field">
            <ion-label>Banner ativo</ion-label>
            <ion-toggle
              slot="end"
              :checked="editForm.is_active"
              @ionChange="editForm.is_active = detailChecked($event)"
            ></ion-toggle>
          </ion-item>
          <p v-if="editError" class="err-text">{{ editError }}</p>
          <div class="yz-actions">
            <ion-button size="small" :disabled="editingBusy" @click="saveEdit(banner)">
              {{ editingBusy ? 'Salvando…' : 'Salvar' }}
            </ion-button>
            <ion-button size="small" fill="outline" @click="cancelEdit">Cancelar</ion-button>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-content>
        <h2 class="card-title">Novo banner</h2>
        <ion-item lines="full" class="yz-field">
          <ion-input v-model="createForm.title" label="Título (opcional)" label-placement="floating" :maxlength="120" />
        </ion-item>
        <ion-item lines="full" class="yz-field">
          <ion-input
            v-model="createForm.link_url"
            label="Link (opcional, http/https)"
            label-placement="floating"
            inputmode="url"
            :maxlength="255"
          />
        </ion-item>
        <FileUploader
          v-model="imageModel"
          label="Imagem do banner"
          :max-size-m-b="5"
          :progress="uploadProgress"
          :busy="creating"
          :field-error="createErrors.image"
          hint="PNG, JPG ou WebP até 5 MB."
          @error="toast"
        />
        <p v-if="createError" class="err-text">{{ createError }}</p>
        <ion-button expand="block" :disabled="creating || !imageFile" @click="create">
          <ion-spinner v-if="creating" name="crescent"></ion-spinner>
          {{ creating ? 'Enviando…' : 'Adicionar banner' }}
        </ion-button>
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
  IonSpinner,
  IonToast,
  IonToggle,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { appearanceApi, type Banner } from '@/api/appearance'
import { apiMessage, fieldErrors } from '@/composables/errors'
import FileUploader from '@/components/FileUploader.vue'

const emit = defineEmits<{ denied: [] }>()

const router = useRouter()

const loading = ref(true)
const banners = ref<Banner[]>([])
const showHero = ref(true)
const heroBusy = ref(false)
const heroError = ref<string | null>(null)

const createForm = reactive({ title: '', link_url: '' })
const imageFile = ref<File | null>(null)
const uploadProgress = ref<number | null>(null)
const creating = ref(false)
const createError = ref<string | null>(null)
const createErrors = ref<Record<string, string>>({})

const editingId = ref<number | null>(null)
const editingBusy = ref(false)
const editError = ref<string | null>(null)
const editErrors = ref<Record<string, string>>({})
const editForm = reactive({ title: '', link_url: '', is_active: true })

const removingId = ref<number | null>(null)

const toastOpen = ref(false)
const toastMessage = ref('')

const imageModel = computed<File | File[] | null>({
  get: () => imageFile.value,
  set: (value) => {
    imageFile.value = Array.isArray(value) ? (value[0] ?? null) : value
  },
})

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }> | undefined)?.detail
  return Boolean(detail?.checked)
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function firstErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(fieldErrors(e))) out[k] = v[0] ?? ''
  return out
}

/** 403 neste grupo é sempre permissão (sem plano) → a aba some. */
async function handleForbidden(e: ApiError) {
  if (e.status === 401) {
    await router.replace({ name: 'login' })
    return
  }
  emit('denied')
}

async function load() {
  loading.value = true
  try {
    const { data, meta } = await appearanceApi.banners()
    banners.value = data
    showHero.value = meta.show_hero
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleForbidden(e)
      return
    }
    toast(apiMessage(e))
  } finally {
    loading.value = false
  }
}

async function saveHero(value: boolean) {
  heroBusy.value = true
  heroError.value = null
  try {
    showHero.value = await appearanceApi.updateHero(value)
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleForbidden(e)
      return
    }
    heroError.value = apiMessage(e)
  } finally {
    heroBusy.value = false
  }
}

async function create() {
  if (!imageFile.value) {
    toast('Escolha a imagem do banner.')
    return
  }
  creating.value = true
  createError.value = null
  createErrors.value = {}
  try {
    const fd = new FormData()
    fd.append('image', imageFile.value)
    const title = createForm.title.trim()
    const link = createForm.link_url.trim()
    if (title) fd.append('title', title)
    if (link) fd.append('link_url', link)
    const { data } = await appearanceApi.createBanner(fd, (pct) => {
      uploadProgress.value = pct
    })
    banners.value = [...banners.value, data]
    createForm.title = ''
    createForm.link_url = ''
    imageFile.value = null
    toast('Banner adicionado.')
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleForbidden(e)
      return
    }
    createErrors.value = firstErrors(e)
    createError.value = apiMessage(e)
  } finally {
    creating.value = false
    uploadProgress.value = null
  }
}

function startEdit(banner: Banner) {
  editingId.value = banner.id
  editError.value = null
  editErrors.value = {}
  editForm.title = banner.title ?? ''
  editForm.link_url = banner.link_url ?? ''
  editForm.is_active = banner.is_active
}

function cancelEdit() {
  editingId.value = null
  editError.value = null
  editErrors.value = {}
}

async function saveEdit(banner: Banner) {
  editingBusy.value = true
  editError.value = null
  editErrors.value = {}
  try {
    // Envia SEMPRE `is_active` (backend booleaniza o ausente para false).
    const updated = await appearanceApi.updateBanner(banner.id, {
      title: editForm.title.trim() || null,
      link_url: editForm.link_url.trim() || null,
      is_active: editForm.is_active,
    })
    banners.value = banners.value.map((b) => (b.id === banner.id ? updated : b))
    editingId.value = null
    toast('Banner salvo.')
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleForbidden(e)
      return
    }
    editErrors.value = firstErrors(e)
    editError.value = apiMessage(e)
  } finally {
    editingBusy.value = false
  }
}

async function askRemove(banner: Banner) {
  if (!window.confirm(`Excluir o banner "${banner.title || 'sem título'}"?`)) return
  removingId.value = banner.id
  try {
    await appearanceApi.removeBanner(banner.id)
    banners.value = banners.value.filter((b) => b.id !== banner.id)
    toast('Banner excluído.')
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleForbidden(e)
      return
    }
    toast(apiMessage(e))
  } finally {
    removingId.value = null
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.hero-row {
  --padding-start: 0;
  --padding-end: 0;
}
.banner-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.banner-thumb {
  width: 84px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--yz-mist);
  flex: none;
}
.banner-info {
  flex: 1;
  min-width: 0;
}
.banner-info h3 {
  margin: 0 0 2px;
  font-size: 0.95rem;
  color: var(--ion-text-color);
}
.banner-info .link {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.banner-actions {
  display: flex;
  flex-direction: column;
  flex: none;
}
.edit-box {
  margin-top: 10px;
  border-top: 1px solid var(--yz-mist);
  padding-top: 10px;
}
</style>
