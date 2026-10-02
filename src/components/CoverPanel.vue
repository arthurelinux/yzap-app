<!-- CoverPanel — aba Capa do painel (GET/PUT /appearance/cover).
  -
  - Upload S3 (`catalog/covers/{user_id}`) com a mesma validação do painel
  - (imagem 5 MB; apaga a anterior). Envio via `FileUploader` (sem recorte,
  - como no painel).
  -
  - Gating: grupo SEM plano pago (só `store_theme`). 403 → `denied` (aba some).
-->
<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando capa…</p>
  </div>

  <ion-card v-else>
    <ion-card-content>
      <h2 class="card-title">Capa da loja</h2>
      <p class="hint" style="margin-top: -4px">
        Imagem de topo da sua vitrine pública. Enviar uma nova substitui a atual.
      </p>

      <FileUploader
        v-model="coverModel"
        label="Imagem de capa"
        :max-size-m-b="5"
        :current-url="currentUrl"
        :progress="uploadProgress"
        :busy="saving"
        :field-error="fieldError"
        hint="PNG, JPG ou WebP até 5 MB."
        @error="toast"
      />

      <p v-if="saveError" class="err-text" role="alert">{{ saveError }}</p>
      <ion-button expand="block" :disabled="saving || !coverFile" @click="save">
        <ion-spinner v-if="saving" name="crescent"></ion-spinner>
        {{ saving ? 'Enviando…' : 'Enviar capa' }}
      </ion-button>
    </ion-card-content>
  </ion-card>

  <ion-toast
    :is-open="toastOpen"
    :message="toastMessage"
    :duration="2200"
    position="top"
    @didDismiss="toastOpen = false"
  ></ion-toast>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonButton, IonCard, IonCardContent, IonSpinner, IonToast } from '@ionic/vue'
import { ApiError } from '@/api/client'
import { appearanceApi } from '@/api/appearance'
import { apiMessage, fieldErrors } from '@/composables/errors'
import FileUploader from '@/components/FileUploader.vue'
import { useShopStore } from '@/stores/shop'

const emit = defineEmits<{ denied: [] }>()

const router = useRouter()
const shop = useShopStore()

const loading = ref(true)
const saving = ref(false)
const saveError = ref<string | null>(null)
const fieldError = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const uploadProgress = ref<number | null>(null)
const coverUrl = ref<string | null>(null)

const toastOpen = ref(false)
const toastMessage = ref('')

/** Capa atual: endpoint dedicado; cai para a da loja em caso de divergência. */
const currentUrl = computed(() => coverUrl.value ?? shop.store?.cover_image_url ?? null)

const coverModel = computed<File | File[] | null>({
  get: () => coverFile.value,
  set: (value) => {
    coverFile.value = Array.isArray(value) ? (value[0] ?? null) : value
  },
})

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  loading.value = true
  try {
    const { data } = await appearanceApi.cover()
    coverUrl.value = data.cover_image_url
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      emit('denied')
      return
    }
    saveError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!coverFile.value) return
  saving.value = true
  saveError.value = null
  fieldError.value = null
  const before = currentUrl.value
  try {
    coverUrl.value = await appearanceApi.updateCover(coverFile.value, (pct) => {
      uploadProgress.value = pct
    })
    // Integridade (multipart em PUT pode ser descartado pelo PHP — ver STATUS).
    if (coverUrl.value === before) {
      saveError.value =
        'A API não recebeu a imagem (upload por PUT multipart indisponível nesta versão). Use o painel web ou atualize a API.'
    } else {
      // Mantém a loja em memória coerente com a capa nova.
      const store = shop.store
      if (store) shop.applyStore({ ...store, cover_image_url: coverUrl.value })
      toast('Capa atualizada.')
    }
    coverFile.value = null
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
      return
    }
    if (e instanceof ApiError && e.status === 403) {
      emit('denied')
      return
    }
    fieldError.value = fieldErrors(e)['cover_image']?.[0] ?? null
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
    uploadProgress.value = null
  }
}

onMounted(() => {
  void load()
})
</script>
