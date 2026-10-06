<template>
  <ion-page>
    <AppBar back back-href="/produtos" />
    <ion-content class="ion-padding">
      <PageHead :title="isEdit ? 'Editar produto' : 'Novo produto'" sub="Meu catálogo" />

      <div v-if="isEdit && loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando produto…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="cube-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <form v-else @submit.prevent="save">
        <ion-list lines="full" class="card">
          <ion-item>
            <ion-label position="stacked">Nome *</ion-label>
            <ion-input
              v-model="form.name"
              placeholder="Ex.: Pizza grande"
              :maxlength="150"
            ></ion-input>
            <p v-if="err('name')" class="err-text">{{ err('name') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Preço (R$) *</ion-label>
            <ion-input
              v-model="form.price"
              inputmode="decimal"
              placeholder="29,90"
              :maxlength="30"
            ></ion-input>
            <p v-if="err('price')" class="err-text">{{ err('price') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Preço promocional</ion-label>
            <ion-input
              v-model="form.promotional_price"
              inputmode="decimal"
              placeholder="opcional"
              :maxlength="30"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Categoria</ion-label>
            <ion-select
              :value="form.category_id"
              interface="action-sheet"
              placeholder="Sem categoria"
              @ionChange="form.category_id = Number($event.detail?.value) || null"
            >
              <ion-select-option :value="null">Sem categoria</ion-select-option>
              <ion-select-option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Código (único na loja)</ion-label>
            <ion-input v-model="form.code" placeholder="opcional" :maxlength="100"></ion-input>
            <p v-if="err('code')" class="err-text">{{ err('code') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Código de barras (GTIN)</ion-label>
            <ion-input
              v-model="form.gtin"
              inputmode="numeric"
              placeholder="8 a 14 dígitos"
              :maxlength="14"
            ></ion-input>
            <p v-if="err('gtin')" class="err-text">{{ err('gtin') }}</p>
          </ion-item>
          <!-- Lookup GTIN (contrato § Grupo 6): exige rede, nunca trava o form. -->
          <div class="gtin-block">
            <ion-button
              size="small"
              fill="outline"
              :disabled="lookupBusy"
              @click="lookupBarcode"
            >
              <ion-spinner v-if="lookupBusy" name="crescent"></ion-spinner>
              <ion-icon v-else slot="start" name="barcode-outline"></ion-icon>
              {{ lookupBusy ? 'Buscando…' : 'Buscar dados do código' }}
            </ion-button>
            <p v-if="lookupError" class="err-text">{{ lookupError }}</p>
            <p v-if="lookupFilled" class="ok-text">{{ lookupFilled }}</p>
            <div v-if="lookup" class="gtin-result">
              <img
                v-if="lookupPhoto"
                :src="lookupPhoto"
                alt="Foto da base global"
                loading="lazy"
              />
              <div class="gtin-info">
                <strong>{{ lookup.name || 'Produto da base global' }}</strong>
                <p v-if="lookup.brand">Marca: {{ lookup.brand }}</p>
                <p v-if="lookup.quantity">Quantidade: {{ lookup.quantity }}</p>
                <p v-if="lookupCategoriesText">Categoria: {{ lookupCategoriesText }}</p>
                <p v-if="lookup.in_global_base" class="global-note">
                  Imagem da base global — a sua foto (abaixo) sempre vence.
                </p>
              </div>
            </div>
          </div>
          <div class="desc-block">
            <RichTextEditor
              v-model="form.description"
              label="Descrição"
              hint="Use a barra acima para títulos, listas e links — igual ao painel web."
            />
            <p v-if="err('description')" class="err-text">{{ err('description') }}</p>
          </div>
          <ion-item>
            <ion-label position="stacked">Estoque</ion-label>
            <ion-input v-model="form.stock" inputmode="numeric" placeholder="ex.: 10"></ion-input>
            <p v-if="err('stock')" class="err-text">{{ err('stock') }}</p>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Estoque mínimo (alerta)</ion-label>
            <ion-input v-model="form.stock_min" inputmode="numeric" placeholder="ex.: 3"></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-label>Produto ativo</ion-label>
            <ion-toggle
              :checked="form.is_active"
              @ionChange="form.is_active = detailChecked($event)"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <FileUploader
          v-model="imageModel"
          :label="isEdit && original.image_url ? 'Trocar imagem' : 'Imagem'"
          :crop="PRODUCT_CROP"
          :max-size-m-b="4"
          :current-url="isEdit ? (original.image_url ?? null) : null"
          :progress="uploadProgress"
          :busy="saving"
          :field-error="err('image')"
          hint="PNG, JPG ou WebP até 4 MB, com recorte quadrado. Na edição, a imagem entra pela galeria do produto."
          @error="toast"
        />

        <div class="yz-actions">
          <ion-button type="submit" :disabled="saving">
            <ion-spinner v-if="saving" name="crescent"></ion-spinner>
            {{ isEdit ? 'Salvar alterações' : 'Cadastrar produto' }}
          </ion-button>
          <ion-button fill="outline" router-link="/produtos">Cancelar</ion-button>
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
  IonToggle,
  IonToast,
} from '@ionic/vue'
import {
  catalogApi,
  productFormData,
  productJsonBody,
  type Category,
  type GtinLookupResult,
  type Product,
} from '@/api/products'
import { ApiError } from '@/api/client'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import FileUploader, { PRODUCT_CROP } from '@/components/FileUploader.vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => (route.name === 'produto-editar' ? String(route.params.id) : ''))
const isEdit = computed(() => Boolean(id.value))

const original = reactive<Partial<Product>>({})
const categories = ref<Category[]>([])
const form = reactive({
  name: '',
  price: '',
  category_id: null as number | null,
  code: '',
  gtin: '',
  description: '',
  promotional_price: '',
  is_active: true,
  stock: '',
  stock_min: '',
})
const imageFile = ref<File | null>(null)
const uploadProgress = ref<number | null>(null)

/** Ponte tipada p/ o v-model do FileUploader (File | File[] | null). */
const imageModel = computed<File | File[] | null>({
  get: () => imageFile.value,
  set: (value) => {
    imageFile.value = Array.isArray(value) ? (value[0] ?? null) : value
  },
})
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

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }>)?.detail
  return Boolean(detail?.checked)
}

/* ---------- Lookup GTIN (GET /products/lookup?gtin=) ----------
 * Só preenche campos ainda vazios (não apaga o que o lojista digitou).
 * Marca/quantidade/categorias da base aparecem no cartão p/ conferência;
 * a categoria do lookup é aplicada quando o nome bate com uma categoria
 * da loja. Foto: a global é só referência — a própria (FileUploader)
 * sempre vence no save. Exige rede, mas nunca trava o formulário. */
const lookup = ref<GtinLookupResult | null>(null)
const lookupBusy = ref(false)
const lookupError = ref('')
const lookupFilled = ref('')

const lookupPhoto = computed(
  () => lookup.value?.image_url || lookup.value?.global_image_url || null,
)
const lookupCategoriesText = computed(() => {
  const raw = lookup.value?.categories
  if (!raw) return ''
  return Array.isArray(raw) ? raw.filter(Boolean).join(', ') : String(raw)
})

function applyLookup(data: GtinLookupResult) {
  const filled: string[] = []
  if (!form.name.trim() && data.name) {
    form.name = data.name
    filled.push('nome')
  }
  if (!form.category_id && data.categories && categories.value.length) {
    const names = (Array.isArray(data.categories) ? data.categories : String(data.categories).split(','))
      .map((c) => String(c).trim().toLowerCase())
      .filter(Boolean)
    const match = categories.value.find((c) => names.some((n) => c.name.toLowerCase() === n || c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())))
    if (match) {
      form.category_id = match.id
      filled.push('categoria')
    }
  }
  lookupFilled.value = filled.length
    ? `Preenchemos: ${filled.join(' e ')} — confira antes de salvar.`
    : 'Dados da base global acima — preencha o que faltar.'
}

async function lookupBarcode() {
  lookupError.value = ''
  lookupFilled.value = ''
  const gtin = form.gtin.replace(/\D/g, '')
  if (!/^\d{8,14}$/.test(gtin)) {
    lookupError.value = 'Digite o código de barras com 8 a 14 dígitos para buscar.'
    return
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    lookupError.value = 'Sem conexão — a busca do código precisa de internet. O formulário continua liberado.'
    return
  }
  lookupBusy.value = true
  try {
    const { data } = await catalogApi.lookupGtin(gtin)
    if (!data?.found) {
      lookup.value = null
      lookupError.value = 'Código não encontrado na base global. Preencha os dados manualmente.'
      return
    }
    lookup.value = data
    applyLookup(data)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    lookup.value = null
    if (e instanceof ApiError && e.status === 404) {
      lookupError.value = 'Código não encontrado na base global. Preencha os dados manualmente.'
    } else if (e instanceof ApiError && e.status === 422) {
      lookupError.value = apiMessage(e, 'Código de barras inválido (use 8 a 14 dígitos).')
    } else {
      lookupError.value = 'Não foi possível buscar agora — confira a conexão. O formulário continua liberado.'
    }
  } finally {
    lookupBusy.value = false
  }
}

async function loadCategories() {
  try {
    const { data } = await catalogApi.categories()
    categories.value = data ?? []
  } catch {
    /* select fica vazio */
  }
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await catalogApi.product(id.value)
    Object.assign(original, data)
    form.name = data.name ?? ''
    form.price = String(data.price ?? '')
    form.category_id = data.category_id ?? null
    form.code = data.code ?? ''
    form.gtin = data.gtin ?? ''
    form.description = data.description ?? ''
    form.promotional_price =
      data.promotional_price === null || data.promotional_price === undefined
        ? ''
        : String(data.promotional_price)
    form.is_active = data.is_active !== false
    form.stock = data.stock === null || data.stock === undefined ? '' : String(data.stock)
    form.stock_min =
      data.stock_min === null || data.stock_min === undefined ? '' : String(data.stock_min)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

/**
 * Create: POST multipart (PHP parseia POST normalmente).
 * Edit: PUT JSON (defeito conhecido do multipart em PUT) + imagem nova,
 * quando houver, vai por POST /products/{id}/images (multipart POST ok).
 */
async function save() {
  errors.value = {}
  if (!form.name.trim() || form.price === '') {
    toast('Preencha nome e preço.')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      const body = productJsonBody(form, original)
      if (imageFile.value) delete body.image
      const hasChanges = Object.keys(body).length > 0
      let productId = id.value
      if (hasChanges) {
        const { data } = await catalogApi.updateProduct(id.value, body)
        Object.assign(original, data)
      }
      if (imageFile.value) {
        await catalogApi.addImages(productId, [imageFile.value], (pct) => {
          uploadProgress.value = pct
        })
        const { data } = await catalogApi.product(productId)
        Object.assign(original, data)
      }
      toast('Produto salvo.')
      await router.replace(`/produtos/${productId}`)
    } else {
      const fd = productFormData(form, imageFile.value)
      const { data } = await catalogApi.createProduct(fd, (pct) => {
        uploadProgress.value = pct
      })
      toast('Produto cadastrado.')
      await router.replace(`/produtos/${data.id}`)
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    const fields = fieldErrors(e)
    errors.value = fields
    toast(Object.keys(fields).length ? 'Confira os campos destacados.' : apiMessage(e))
  } finally {
    saving.value = false
    uploadProgress.value = null
  }
}

onMounted(async () => {
  await Promise.all([load(), loadCategories()])
})
</script>

<style scoped>
.card {
  background: var(--ion-card-background);
  border-radius: 13px;
  overflow: hidden;
}
.desc-block {
  padding: 10px 16px 12px;
  border-top: 1px solid var(--ion-color-light, rgba(128, 128, 128, 0.2));
}
.gtin-block {
  padding: 10px 16px 12px;
  border-top: 1px solid var(--ion-color-light, rgba(128, 128, 128, 0.2));
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.ok-text {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ion-color-success, #2a7d4f);
}
.gtin-result {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
  background: var(--yz-mint);
  border-radius: 10px;
  padding: 10px;
}
.gtin-result img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
  flex-shrink: 0;
}
.gtin-info {
  font-size: 0.82rem;
  color: var(--ion-text-color);
  min-width: 0;
}
.gtin-info p {
  margin: 2px 0;
  color: var(--yz-muted);
}
.global-note {
  font-style: italic;
}
</style>
