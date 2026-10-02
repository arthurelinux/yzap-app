<template>
  <ion-page>
    <AppBar back back-href="/produtos" />
    <ion-content class="ion-padding">
      <PageHead :title="product.name || 'Produto'" :sub="product.category_name || 'Meu catálogo'" />

      <div v-if="loading" class="yz-state">
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

      <template v-else>
        <div class="hero">
          <img
            v-if="primaryImage"
            :src="primaryImage"
            alt=""
            class="hero-img"
            loading="lazy"
          />
          <div v-else class="hero-empty">
            <ion-icon name="image-outline"></ion-icon>
            <span>Sem imagem</span>
          </div>
        </div>

        <div class="row-between">
          <div>
            <p class="price big">{{ money(product.price) }}</p>
            <p v-if="product.promotional_price" class="muted">
              promo {{ money(product.promotional_price) }}
            </p>
          </div>
          <ion-badge :color="product.is_active === false ? 'medium' : 'success'">
            {{ product.is_active === false ? 'inativo' : 'ativo' }}
          </ion-badge>
        </div>

        <p v-if="product.description" class="muted desc">{{ product.description }}</p>

        <!-- Estoque rápido (permissão products, sem movimento). -->
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>Estoque</h2>
            <div v-if="product.uses_variants" class="muted">
              Produto com variantes — ajuste por variante no estoque.
              <ion-button
                size="small"
                fill="outline"
                router-link="/estoque"
                class="ion-margin-start"
              >
                Abrir estoque
              </ion-button>
            </div>
            <div v-else class="url-row">
              <ion-input
                v-model="quickStock"
                inputmode="numeric"
                :value="quickStock"
                placeholder="saldo"
              ></ion-input>
              <ion-button class="btn-open" :disabled="stockBusy" @click="saveQuickStock">
                <ion-spinner v-if="stockBusy" name="crescent"></ion-spinner>
                Atualizar
              </ion-button>
            </div>
            <p v-if="product.stock_min !== null && product.stock_min !== undefined" class="hint">
              mínimo para alerta: {{ product.stock_min }}
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Imagens (galeria). -->
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>Imagens</h2>
            <div class="img-grid" v-if="(product.images ?? []).length">
              <div v-for="img in product.images ?? []" :key="img.id" class="img-cell">
                <img :src="img.url" alt="" loading="lazy" />
                <div class="img-actions">
                  <ion-button
                    size="small"
                    fill="clear"
                    :disabled="img.is_primary || imgBusy"
                    @click="makePrimary(img)"
                  >
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                  </ion-button>
                  <ion-button size="small" fill="clear" color="danger" :disabled="imgBusy" @click="removeImage(img)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
                <span v-if="img.is_primary" class="primary-tag">principal</span>
              </div>
            </div>
            <p v-else class="muted">Nenhuma imagem na galeria.</p>
            <div class="yz-field">
              <input type="file" accept="image/*" multiple @change="pickImages" />
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Variantes: somente leitura no v1 (estrutura fica para v2). -->
        <ion-card v-if="product.uses_variants" class="panel-card">
          <ion-card-content>
            <h2>Variantes</h2>
            <div v-if="variantsBusy" class="yz-state">
              <ion-spinner></ion-spinner>
            </div>
            <ion-list v-else-if="variants.length" lines="full">
              <ion-item v-for="v in variants" :key="v.id">
                <ion-label>
                  <h3>{{ v.code || `Variante ${v.id}` }}</h3>
                  <p>
                    estoque {{ v.stock ?? 0 }}
                    <template v-if="v.is_active === false"> · inativa</template>
                  </p>
                </ion-label>
                <ion-note slot="end" class="price">{{ money(v.price ?? 0) }}</ion-note>
              </ion-item>
            </ion-list>
            <p v-else class="muted">Nenhuma variante cadastrada.</p>
          </ion-card-content>
        </ion-card>

        <div class="yz-actions">
          <ion-button :disabled="deleting" @click="goEdit">
            <ion-icon slot="start" name="create-outline"></ion-icon>Editar
          </ion-button>
          <ion-button fill="outline" color="danger" :disabled="deleting" @click="remove">
            <ion-spinner v-if="deleting" name="crescent"></ion-spinner>
            Excluir
          </ion-button>
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
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { catalogApi, type Product, type ProductImage, type ProductVariant } from '@/api/products'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const product = reactive<Partial<Product>>({})
const variants = ref<ProductVariant[]>([])
const quickStock = ref('')
const loading = ref(true)
const stockBusy = ref(false)
const imgBusy = ref(false)
const variantsBusy = ref(false)
const deleting = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const primaryImage = computed(() => {
  const imgs = product.images ?? []
  return imgs.find((i) => i.is_primary)?.url ?? imgs[0]?.url ?? product.image_url ?? null
})

function money(value: number | string | undefined): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await catalogApi.product(id)
    Object.assign(product, data)
    quickStock.value =
      data.stock === null || data.stock === undefined ? '' : String(data.stock)
    if (data.uses_variants) void loadVariants()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

async function loadVariants() {
  variantsBusy.value = true
  try {
    const { data } = await catalogApi.variants(id)
    variants.value = data.variants ?? []
  } catch {
    variants.value = []
  } finally {
    variantsBusy.value = false
  }
}

/** PATCH /products/{product}/stock — ajuste rápido sem movimento. */
async function saveQuickStock() {
  const raw = quickStock.value.trim()
  if (raw === '') {
    toast('Informe um saldo (ou use o estoque com histórico).')
    return
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    toast('Saldo inválido.')
    return
  }
  stockBusy.value = true
  try {
    const { data } = await catalogApi.quickStock(id, value)
    product.stock = data.stock
    toast('Estoque atualizado.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    stockBusy.value = false
  }
}

function pickImages(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (!files.length) return
  void uploadImages(files, input)
}

async function uploadImages(files: File[], input: HTMLInputElement | null) {
  imgBusy.value = true
  try {
    const oversized = files.filter((f) => f.size > 4 * 1024 * 1024)
    const ok = files.filter((f) => f.size <= 4 * 1024 * 1024)
    if (oversized.length) toast('Imagens acima de 4 MB foram ignoradas.')
    if (ok.length) {
      await catalogApi.addImages(id, ok)
      const { data } = await catalogApi.product(id)
      Object.assign(product, data)
      if (!oversized.length) toast('Imagens adicionadas.')
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    imgBusy.value = false
    if (input) input.value = ''
  }
}

async function makePrimary(img: ProductImage) {
  imgBusy.value = true
  try {
    await catalogApi.setPrimaryImage(img.id)
    const { data } = await catalogApi.product(id)
    Object.assign(product, data)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    imgBusy.value = false
  }
}

async function removeImage(img: ProductImage) {
  imgBusy.value = true
  try {
    await catalogApi.removeImage(img.id)
    const { data } = await catalogApi.product(id)
    Object.assign(product, data)
    toast('Imagem removida.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    imgBusy.value = false
  }
}

async function goEdit() {
  await router.push(`/produtos/${id}/editar`)
}

/** DELETE — com variantes/movimentações o backend responde 422 (aviso honesto). */
async function remove() {
  const ok = window.confirm('Excluir este produto? Se houver histórico, o servidor vai recusar.')
  if (!ok) return
  deleting.value = true
  try {
    await catalogApi.removeProduct(id)
    toast('Produto excluído.')
    await router.replace('/produtos')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.hero {
  border-radius: 13px;
  overflow: hidden;
  background: var(--ion-card-background);
  margin-bottom: 14px;
}
.hero-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
}
.hero-empty {
  height: 140px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  color: var(--yz-muted);
  font-size: 13px;
}
.price.big {
  font-size: 22px;
  font-weight: 800;
}
.desc {
  margin: 10px 0 14px;
  white-space: pre-wrap;
}
.panel-card {
  background: var(--ion-card-background);
}
.img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}
.img-cell {
  position: relative;
}
.img-cell img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.img-actions {
  display: flex;
  justify-content: center;
}
.primary-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(8, 127, 111, 0.92);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 99px;
}
.yz-field {
  margin-top: 12px;
}
</style>
