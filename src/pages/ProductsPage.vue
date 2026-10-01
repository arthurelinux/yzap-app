<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Produtos" sub="Meu catálogo" />

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar por nome ou código"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
        <ion-select
          :value="categoryId"
          interface="action-sheet"
          placeholder="Categoria"
          @ionChange="onCategory"
        >
          <ion-select-option :value="0">Todas</ion-select-option>
          <ion-select-option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </ion-select-option>
        </ion-select>
        <ion-select
          :value="activeFilter"
          interface="action-sheet"
          placeholder="Status"
          @ionChange="onActive"
        >
          <ion-select-option value="">Todos</ion-select-option>
          <ion-select-option value="1">Ativos</ion-select-option>
          <ion-select-option value="0">Inativos</ion-select-option>
        </ion-select>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando produtos…</p>
      </div>

      <ion-text v-else-if="list.error && !list.items.length" color="danger">
        <div class="yz-state">
          <ion-icon name="cube-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ list.error }}</p>
          <ion-button fill="outline" @click="refresh">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="list.items.length" lines="full" class="card">
          <ion-item
            v-for="product in list.items"
            :key="product.id"
            :button="true"
            detail
            @click="open(product.id)"
          >
            <img
              v-if="product.image_url"
              slot="start"
              :src="product.image_url"
              class="thumb"
              loading="lazy"
              alt=""
            />
            <div v-else class="avatar-a" slot="start">
              <ion-icon name="cube-outline"></ion-icon>
            </div>
            <ion-label>
              <h3>
                {{ product.name }}
                <ion-badge :color="product.is_active === false ? 'medium' : 'success'">
                  {{ product.is_active === false ? 'inativo' : 'ativo' }}
                </ion-badge>
              </h3>
              <p>
                {{ product.category_name || 'sem categoria' }}
                <template v-if="product.uses_variants"> · variantes</template>
                <template v-else-if="product.stock !== null && product.stock !== undefined">
                  · estoque {{ product.stock }}
                </template>
              </p>
            </ion-label>
            <ion-note slot="end" class="price">{{ money(product.price) }}</ion-note>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="cube-outline"></ion-icon>
          <h3>{{ search ? 'Nenhum produto encontrado' : 'Nenhum produto ainda' }}</h3>
          <p>{{ search ? 'Tente outro nome ou código.' : 'Cadastre o primeiro produto do catálogo.' }}</p>
          <ion-button router-link="/produtos/novo">Cadastrar produto</ion-button>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </template>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button router-link="/produtos/novo">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2200"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { catalogApi, type Category } from '@/api/products'
import { apiMessage, routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const search = ref('')
const categoryId = ref(0)
const activeFilter = ref('')
const categories = ref<Category[]>([])
const toastOpen = ref(false)
const toastMessage = ref('')

const list = useList((page: number) =>
  catalogApi.products({
    page,
    per_page: 20,
    search: search.value.trim() || undefined,
    category_id: categoryId.value || undefined,
    is_active: activeFilter.value === '' ? undefined : activeFilter.value === '1',
  }),
)

function money(value: number | string): string {
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

async function refresh() {
  try {
    await list.refresh()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
  }
}

function onCategory(event: CustomEvent) {
  categoryId.value = Number(event.detail?.value ?? 0)
  void refresh()
}

function onActive(event: CustomEvent) {
  activeFilter.value = String(event.detail?.value ?? '')
  void refresh()
}

async function onInfinite(event: CustomEvent) {
  try {
    await list.loadMore()
  } catch {
    /* erro já em list.error */
  } finally {
    const target = event.target as HTMLIonInfiniteScrollElement | null
    target?.complete()
  }
}

async function open(id: number) {
  await router.push(`/produtos/${id}`)
}

async function loadCategories() {
  try {
    const { data } = await catalogApi.categories()
    categories.value = data ?? []
  } catch {
    /* filtro fica sem opções (erro já aparece na lista) */
  }
}

onMounted(async () => {
  await Promise.all([refresh(), loadCategories()])
})
</script>

<style scoped>
ion-searchbar {
  --box-shadow: none;
}
ion-select {
  max-width: 130px;
}
.thumb {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: 10px;
  margin-right: 12px;
}
.avatar-a ion-icon {
  font-size: 20px;
}
</style>
