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
            <ion-label position="stacked">Descrição</ion-label>
            <ion-textarea v-model="form.description" :rows="3" auto-grow :maxlength="50000"></ion-textarea>
          </ion-item>
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

        <div class="yz-field">
          <label>{{ isEdit && original.image_url ? 'Trocar imagem' : 'Imagem' }}</label>
          <input type="file" accept="image/*" @change="pickFile" />
          <p class="hint">JPG/PNG até 4 MB. Na edição a imagem entra pela galeria do produto.</p>
        </div>

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
  IonTextarea,
  IonToggle,
  IonToast,
} from '@ionic/vue'
import {
  catalogApi,
  productFormData,
  productJsonBody,
  type Category,
  type Product,
} from '@/api/products'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

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
  description: '',
  promotional_price: '',
  is_active: true,
  stock: '',
  stock_min: '',
})
const imageFile = ref<File | null>(null)
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

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (file && file.size > 4 * 1024 * 1024) {
    toast('Imagem acima de 4 MB — escolha uma menor.')
    if (input) input.value = ''
    return
  }
  imageFile.value = file
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
        await catalogApi.addImages(productId, [imageFile.value])
        const { data } = await catalogApi.product(productId)
        Object.assign(original, data)
      }
      toast('Produto salvo.')
      await router.replace(`/produtos/${productId}`)
    } else {
      const fd = productFormData(form, imageFile.value)
      const { data } = await catalogApi.createProduct(fd)
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
</style>
