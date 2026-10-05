<!-- FileUploader — upload padronizado do app (logo, capa, banners,
  - fotos de produto e comprovantes).
  -
  - Padrão vindo do painel web (repo Laravel irmão):
  -  · CropperJS 1.6.2 (mesma lib/versão do web, via npm), recorte 1:1 com
  -    `viewMode: 1` + `autoCropArea` como no painel (`store.js` 0.9/800px p/ logo,
  -    `products/form.js` 0.92/1200px p/ produto); capa/comprovante sem recorte
  -    (o painel só valida e grava).
  -  · Validação igual à do servidor: `image` (logo 3 MB, produto 4 MB,
  -    capa/banner 5 MB), comprovante `mimes:jpg,jpeg,png,pdf` 5 MB.
  -  · Saída do recorte: JPEG 1200/800px qualidade 0.9, como no painel.
  -
  - O componente SÓ seleciona/valida/recorta e mostra progresso: o envio é do
  - pai (que chama `api.upload` com `onProgress` e repassa em `progress`).
  - Câmera nativa (SDK Capacitor) fica para fase própria futura.
-->
<template>
  <div class="fu">
    <p v-if="label" class="fu-label">{{ label }}</p>

    <!-- Área de toque (mobile) / dropzone (desktop). -->
    <div
      class="fu-drop"
      :class="{ dragging, disabled: isDisabled }"
      role="button"
      tabindex="0"
      :aria-label="`Escolher ${label.toLowerCase()}`"
      :aria-disabled="isDisabled ? 'true' : 'false'"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragenter.prevent="onDrag(true)"
      @dragover.prevent="onDrag(true)"
      @dragleave.prevent="onDrag(false)"
      @drop.prevent="onDrop"
    >
      <ion-icon name="cloud-upload-outline" aria-hidden="true"></ion-icon>
      <p class="fu-drop-title">{{ dropTitle }}</p>
      <p class="fu-drop-sub">Toque para escolher · ou arraste o arquivo aqui</p>
      <p v-if="hintText" class="hint">{{ hintText }}</p>
      <input
        ref="inputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="hidden-input"
        tabindex="-1"
        aria-hidden="true"
        @change="onPicked"
      />
    </div>

    <!-- Prévia da imagem atual (remota) quando nada novo foi escolhido. -->
    <div v-if="showCurrent" class="fu-current">
      <a
        v-if="openHref && !currentIsPdf"
        :href="openHref"
        target="_blank"
        rel="noopener"
        :aria-label="`Abrir ${label.toLowerCase()} atual`"
      >
        <img
          :src="currentUrl ?? undefined"
          :alt="`${label} atual`"
          class="fu-thumb"
          loading="lazy"
        />
      </a>
      <img
        v-else-if="!currentIsPdf"
        :src="currentUrl ?? undefined"
        :alt="`${label} atual`"
        class="fu-thumb"
        loading="lazy"
      />
      <a
        v-else
        :href="openHref ?? currentUrl ?? undefined"
        target="_blank"
        rel="noopener"
        class="fu-pdf-link"
      >
        <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
        Ver comprovante atual (PDF)
      </a>
      <span class="fu-tag">atual</span>
      <ion-button
        v-if="removableCurrent"
        size="small"
        fill="outline"
        color="danger"
        :disabled="isDisabled"
        @click="$emit('remove-current')"
      >
        <ion-icon slot="start" name="trash-outline"></ion-icon>
        Remover
      </ion-button>
    </div>

    <!-- Prévia da seleção nova, com trocar/remover. -->
    <div v-if="items.length" class="fu-grid">
      <div v-for="(item, i) in items" :key="fileKey(item.file, i)" class="fu-cell">
        <img
          v-if="isImage(item.file)"
          :src="item.url"
          :alt="`Prévia ${i + 1}`"
          class="fu-thumb"
        />
        <div v-else class="fu-pdf">
          <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
          <span>{{ item.file.name }}</span>
        </div>
        <div class="fu-cell-actions">
          <ion-button size="small" fill="clear" :disabled="isDisabled" @click="openPicker">
            Trocar
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            color="danger"
            :disabled="isDisabled"
            @click="removeAt(i)"
          >
            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
          </ion-button>
        </div>
      </div>
    </div>

    <!-- Progresso real de envio (o pai alimenta via `api.upload` + onProgress). -->
    <div v-if="progress !== null && progress !== undefined" class="fu-progress">
      <ion-progress-bar :value="progress / 100"></ion-progress-bar>
      <p class="hint">Enviando… {{ progress }}%</p>
    </div>

    <p v-if="localError" class="err-text" role="alert">{{ localError }}</p>
    <p v-if="fieldError" class="err-text" role="alert">{{ fieldError }}</p>

    <!-- Recorte (só imagem, quando `crop` configurado — mesma UX do painel). -->
    <ion-modal :is-open="cropOpen" @didDismiss="cancelCrop" @didPresent="onCropPresent">
      <ion-header>
        <ion-toolbar>
          <ion-title>Recortar imagem</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="cancelCrop">Fechar</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p class="hint">{{ cropIndex + 1 }} de {{ cropQueue.length }}</p>
        <div class="fu-crop-stage">
          <img ref="cropImgRef" :src="cropSrc ?? undefined" alt="Imagem para recorte" @load="initCropper" />
        </div>
        <div class="yz-actions">
          <ion-button fill="outline" :disabled="cropBusy" @click="skipCrop">
            Manter original
          </ion-button>
          <ion-button :disabled="cropBusy" @click="applyCrop">
            <ion-spinner v-if="cropBusy" name="crescent"></ion-spinner>
            Aplicar recorte
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script lang="ts">
/** Recorte 1:1 do painel: logo 800px (`store.js`), produto 1200px (`products/form.js`). */
export interface CropPreset {
  aspectRatio: number
  width: number
  height: number
}
export const LOGO_CROP: CropPreset = { aspectRatio: 1, width: 800, height: 800 }
export const PRODUCT_CROP: CropPreset = { aspectRatio: 1, width: 1200, height: 1200 }
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

interface PreviewItem {
  file: File
  url: string
}

const props = withDefaults(
  defineProps<{
    multiple?: boolean
    label?: string
    accept?: string
    maxSizeMB?: number
    maxFiles?: number
    /** null = sem recorte (capa/comprovante, como no painel). */
    crop?: CropPreset | null
    /** Comprovante aceita PDF (não recorta PDF). */
    allowPdf?: boolean
    currentUrl?: string | null
    currentHref?: string | null
    currentIsPdf?: boolean
    /** Mostra botão "Remover" p/ a imagem atual (emite `remove-current`). */
    removableCurrent?: boolean
    progress?: number | null
    busy?: boolean
    disabled?: boolean
    fieldError?: string | null
    hint?: string | null
  }>(),
  {
    multiple: false,
    label: 'Imagem',
    accept: 'image/png,image/jpeg,image/webp',
    maxSizeMB: 4,
    maxFiles: 10,
    crop: null,
    allowPdf: false,
    currentUrl: null,
    currentHref: null,
    currentIsPdf: false,
    removableCurrent: false,
    progress: null,
    busy: false,
    disabled: false,
    fieldError: null,
    hint: null,
  },
)

const emit = defineEmits<{
  error: [message: string]
  'remove-current': []
}>()

const model = defineModel<File | File[] | null>({ required: true })

const inputRef = ref<HTMLInputElement | null>(null)
const items = ref<PreviewItem[]>([])
const localError = ref<string | null>(null)
const dragging = ref(false)

const isDisabled = computed(() => props.disabled || props.busy)

const hintText = computed(
  () =>
    props.hint ??
    `${props.allowPdf ? 'JPG, PNG ou PDF' : 'PNG, JPG ou WebP'} até ${props.maxSizeMB} MB.`,
)

const dropTitle = computed(() => {
  if (props.multiple) return items.value.length ? 'Adicionar mais fotos' : 'Escolher fotos'
  return items.value.length ? 'Trocar imagem' : 'Escolher imagem'
})

const showCurrent = computed(
  () => !items.value.length && Boolean(props.currentUrl),
)

/** Link de abertura da atual — só quando o pai passa `currentHref` explícito. */
const openHref = computed(() => props.currentHref ?? null)

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function fileKey(file: File, index: number): string {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`
}

function fail(message: string) {
  localError.value = message
  emit('error', message)
}

function validType(file: File): boolean {
  if (isImage(file)) return true
  if (props.allowPdf && isPdf(file)) return true
  return false
}

/** Validação igual à do servidor (422 por campo continua no pai). */
function validate(files: File[]): { ok: File[]; skipped: number } {
  const ok: File[] = []
  let skipped = 0
  for (const file of files) {
    if (!validType(file)) {
      fail(
        props.allowPdf
          ? 'Arquivo inválido — escolha JPG, PNG ou PDF.'
          : 'Arquivo inválido — escolha uma imagem PNG, JPG ou WebP.',
      )
      skipped++
      continue
    }
    if (file.size > props.maxSizeMB * 1024 * 1024) {
      fail(`Arquivo muito grande — o limite é de ${props.maxSizeMB} MB.`)
      skipped++
      continue
    }
    ok.push(file)
  }
  return { ok, skipped }
}

function openPicker() {
  if (isDisabled.value) return
  inputRef.value?.click()
}

function onDrag(state: boolean) {
  if (!isDisabled.value) dragging.value = state
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (isDisabled.value) return
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length) ingest(files)
}

function onPicked(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (input) input.value = ''
  if (files.length) ingest(files)
}

function ingest(files: File[]) {
  localError.value = null
  const { ok } = validate(files)
  if (!ok.length) return
  const capped = props.multiple ? ok.slice(0, props.maxFiles) : ok.slice(0, 1)
  if (props.multiple && items.value.length + capped.length > props.maxFiles) {
    fail(`Máximo de ${props.maxFiles} arquivos por vez.`)
    return
  }
  // Só imagem passa pelo recorte; PDF segue direto (como no painel).
  const toCrop = props.crop ? capped.filter((f) => isImage(f)) : []
  const direct = capped.filter((f) => !toCrop.includes(f))
  stagedDirect.value = direct
  if (toCrop.length) {
    cropQueue.value = toCrop
    cropIndex.value = 0
    croppedAcc.value = []
    openCropFile(0)
  } else {
    finish(direct)
    stagedDirect.value = []
  }
}

// ---------------- Recorte (CropperJS 1.6.2, mesma UX do painel) ----------------
const cropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const cropQueue = ref<File[]>([])
const cropIndex = ref(0)
const croppedAcc = ref<File[]>([])
const stagedDirect = ref<File[]>([])
const cropBusy = ref(false)
const cropImgRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

function openCropFile(index: number) {
  destroyCropper()
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = URL.createObjectURL(cropQueue.value[index])
  cropOpen.value = true
}

function onCropPresent() {
  // A imagem pode carregar antes do fim da animação do modal (blob em cache):
  // nesse caso o `@load` já passou e o Cropper é criado aqui.
  const img = cropImgRef.value
  if (img && img.complete && img.naturalWidth > 0) initCropper()
}

function initCropper() {
  const img = cropImgRef.value
  if (!img || !props.crop || cropper) return
  cropper = new Cropper(img, {
    aspectRatio: props.crop.aspectRatio,
    viewMode: 1,
    autoCropArea: 0.92,
    background: false,
    responsive: true,
  })
}

function destroyCropper() {
  cropper?.destroy()
  cropper = null
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  })
}

async function applyCrop() {
  if (!cropper || cropBusy.value) return
  const preset = props.crop
  if (!preset) return
  cropBusy.value = true
  try {
    const canvas = cropper.getCroppedCanvas({
      width: preset.width,
      height: preset.height,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })
    const blob = await toBlob(canvas)
    const source = cropQueue.value[cropIndex.value]
    const file = blob
      ? new File([blob], source.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
      : source
    nextCrop(file)
  } finally {
    cropBusy.value = false
  }
}

/** "Manter original" — como o `skip-crop` do painel. */
function skipCrop() {
  nextCrop(cropQueue.value[cropIndex.value])
}

function nextCrop(file: File) {
  croppedAcc.value.push(file)
  destroyCropper()
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  cropIndex.value++
  if (cropIndex.value < cropQueue.value.length) {
    openCropFile(cropIndex.value)
  } else {
    cropOpen.value = false
    finish([...stagedDirect.value, ...croppedAcc.value])
    stagedDirect.value = []
    croppedAcc.value = []
    cropQueue.value = []
  }
}

function cancelCrop() {
  destroyCropper()
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = null
  }
  cropOpen.value = false
  // Mantém o que já foi recortado + diretos; descarta o restante da fila.
  if (croppedAcc.value.length || stagedDirect.value.length) {
    finish([...stagedDirect.value, ...croppedAcc.value])
  }
  stagedDirect.value = []
  croppedAcc.value = []
  cropQueue.value = []
}

// ---------------- Seleção / emissão ----------------
function finish(files: File[]) {
  if (!files.length) return
  if (props.multiple) {
    const merged = [...items.value.map((i) => i.file)]
    for (const file of files) {
      const dup = merged.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
      )
      if (!dup && merged.length < props.maxFiles) merged.push(file)
    }
    setItems(merged)
  } else {
    setItems(files.slice(0, 1))
  }
}

function setItems(files: File[]) {
  for (const item of items.value) URL.revokeObjectURL(item.url)
  items.value = files.map((file) => ({
    file,
    url: isImage(file) ? URL.createObjectURL(file) : '',
  }))
  model.value = props.multiple ? files : (files[0] ?? null)
}

function removeAt(index: number) {
  const [removed] = items.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.url)
  const files = items.value.map((i) => i.file)
  model.value = props.multiple ? files : (files[0] ?? null)
}

/** O pai zera o v-model após enviar — limpa prévias junto. */
watch(
  () => model.value,
  (value) => {
    const empty = Array.isArray(value) ? value.length === 0 : value === null
    if (empty && items.value.length) {
      for (const item of items.value) URL.revokeObjectURL(item.url)
      items.value = []
    }
  },
)

onUnmounted(() => {
  destroyCropper()
  for (const item of items.value) URL.revokeObjectURL(item.url)
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
})
</script>

<style scoped>
.fu-label {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ion-text-color);
}
.fu-drop {
  border: 1.5px dashed var(--yz-mist);
  border-radius: var(--yz-radius-md);
  background: var(--yz-card);
  padding: 20px 14px;
  text-align: center;
  cursor: pointer;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.fu-drop ion-icon {
  font-size: 1.7rem;
  color: var(--yz-accent-ink);
}
.fu-drop-title {
  margin: 6px 0 0;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ion-text-color);
}
.fu-drop-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--yz-muted);
}
.fu-drop .hint {
  margin: 4px 0 0;
}
.fu-drop.dragging {
  border-color: var(--yz-accent);
  border-style: solid;
  background: var(--yz-mint);
}
.fu-drop.disabled {
  opacity: 0.6;
  cursor: default;
}
.fu-drop:focus-visible {
  outline: 2px solid var(--yz-accent);
  outline-offset: 2px;
}
.hidden-input {
  display: none;
}
.fu-current {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--yz-mist);
  border-radius: var(--yz-radius-md);
  background: var(--yz-card);
}
.fu-tag {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--yz-muted);
  border: 1px solid var(--yz-mist);
  border-radius: 99px;
  padding: 2px 8px;
}
.fu-pdf-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--yz-accent-ink);
}
.fu-pdf-link ion-icon {
  font-size: 1.4rem;
}
.fu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.fu-cell {
  border: 1px solid var(--yz-mist);
  border-radius: var(--yz-radius-md);
  background: var(--yz-card);
  overflow: hidden;
}
.fu-thumb {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
  background: var(--yz-mist);
}
.fu-grid .fu-thumb {
  width: 100%;
  height: 96px;
  border-radius: 0;
}
.fu-pdf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  font-size: 0.72rem;
  color: var(--ion-text-color);
  word-break: break-all;
}
.fu-pdf ion-icon {
  font-size: 1.6rem;
  color: var(--yz-accent-ink);
}
.fu-cell-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2px;
}
.fu-progress {
  margin-top: 10px;
}
.fu-crop-stage {
  max-height: 60vh;
  overflow: hidden;
  border-radius: var(--yz-radius-md);
  background: #111;
}
.fu-crop-stage img {
  max-width: 100%;
  display: block;
}
/* CropperJS usa fundo quadriculado claro — mantém legível no dark do app. */
.fu-crop-stage :deep(.cropper-container) {
  font-size: 0;
}
</style>
