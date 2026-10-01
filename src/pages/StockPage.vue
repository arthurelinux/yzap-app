<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Estoque" sub="Saldos e ajustes" />

      <div class="yz-chips">
        <ion-chip :color="onlyLow ? 'primary' : ''" @click="toggle('low')">
          <ion-label>Baixos ({{ lowCount }})</ion-label>
        </ion-chip>
        <ion-chip :color="onlyZeroed ? 'primary' : ''" @click="toggle('zeroed')">
          <ion-label>Zerados ({{ zeroedCount }})</ion-label>
        </ion-chip>
        <ion-chip v-if="onlyLow || onlyZeroed" @click="clear">
          <ion-icon name="close-outline"></ion-icon>
          <ion-label>Limpar</ion-label>
        </ion-chip>
      </div>

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar produto"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando estoque…</p>
      </div>

      <ion-text v-else-if="list.error && !list.items.length" color="danger">
        <div class="yz-state">
          <ion-icon name="layers-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ list.error }}</p>
          <ion-button fill="outline" @click="refresh">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="list.items.length" lines="full" class="card">
          <ion-item
            v-for="row in list.items"
            :key="row.product_id"
            :button="true"
            detail
            @click="openAdjust(row)"
          >
            <img
              v-if="row.image_url"
              slot="start"
              :src="row.image_url"
              class="thumb"
              alt=""
              loading="lazy"
            />
            <div v-else class="avatar-a" slot="start">
              <ion-icon name="layers-outline"></ion-icon>
            </div>
            <ion-label>
              <h3>{{ row.product_name }}</h3>
              <p>
                <template v-if="row.code">cód. {{ row.code }} · </template>
                <template v-if="row.uses_variants">com variantes</template>
                <span v-else-if="row.low" class="danger-text">abaixo do mínimo</span>
                <template v-else>mínimo {{ row.stock_min ?? 0 }}</template>
              </p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="(row.balance ?? 0) <= 0 ? 'danger' : row.low ? 'warning' : 'success'"
            >
              {{ row.balance ?? 0 }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="layers-outline"></ion-icon>
          <h3>Nenhum item</h3>
          <p>{{ search ? 'Nada bate com a busca.' : 'Seus produtos com estoque aparecem aqui.' }}</p>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </template>

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
  IonChip,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { stockApi, type StockLine } from '@/api/stock'
import { routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const search = ref('')
const onlyLow = ref(false)
const onlyZeroed = ref(false)
const lowCount = ref(0)
const zeroedCount = ref(0)
const toastOpen = ref(false)
const toastMessage = ref('')

const list = useList(async (page: number) => {
  const env = await stockApi.list({
    page,
    per_page: 30,
    search: search.value.trim() || undefined,
    only_low: onlyLow.value || undefined,
    only_zeroed: onlyZeroed.value || undefined,
  })
  // contadores vêm no meta (low_count/zeroed_count) no primeiro carregamento
  if (page === 1 && env.meta) {
    lowCount.value = Number(env.meta.low_count ?? 0)
    zeroedCount.value = Number(env.meta.zeroed_count ?? 0)
  }
  return env
})

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function refresh() {
  try {
    await list.refresh()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast('Sem conexão ou sem permissão de estoque.')
  }
}

function toggle(kind: 'low' | 'zeroed') {
  if (kind === 'low') {
    onlyLow.value = !onlyLow.value
    if (onlyLow.value) onlyZeroed.value = false
  } else {
    onlyZeroed.value = !onlyZeroed.value
    if (onlyZeroed.value) onlyLow.value = false
  }
  void refresh()
}

function clear() {
  onlyLow.value = false
  onlyZeroed.value = false
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

async function openAdjust(row: StockLine) {
  await router.push({ path: `/estoque/ajuste/${row.product_id}`, query: { name: row.product_name } })
}

onMounted(refresh)
</script>

<style scoped>
ion-searchbar {
  --box-shadow: none;
}
.thumb {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: 10px;
  margin-right: 12px;
}
</style>
