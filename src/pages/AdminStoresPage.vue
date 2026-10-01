<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Lojas" sub="Administração" />

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar loja por nome ou slug"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando lojas…</p>
      </div>

      <ion-text v-else-if="list.error && !list.items.length" color="danger">
        <div class="yz-state">
          <ion-icon name="storefront-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ list.error }}</p>
          <ion-button fill="outline" @click="refresh">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="list.items.length" lines="full">
          <ion-item
            v-for="store in list.items"
            :key="store.id"
            :button="true"
            detail
            @click="open(store.id)"
          >
            <div class="avatar-a" slot="start">
              {{ (store.name || '?').charAt(0).toUpperCase() }}
            </div>
            <ion-label>
              <h3>{{ store.name }}</h3>
              <p>
                {{ store.slug }} · {{ store.products_count ?? 0 }} produtos
                <template v-if="store.owner"> · {{ store.owner.name }}</template>
              </p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="store.is_published === false ? 'medium' : 'success'"
            >
              {{ store.is_published === false ? 'oculta' : 'publicada' }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="storefront-outline"></ion-icon>
          <h3>Nenhuma loja encontrada</h3>
          <p>Ajuste a busca ou o filtro de status.</p>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </template>
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
} from '@ionic/vue'
import { adminApi } from '@/api/admin'
import { routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const search = ref('')

const list = useList((page: number) =>
  adminApi.stores({ page, per_page: 20, search: search.value.trim() || undefined }),
)

async function refresh() {
  try {
    await list.refresh()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
  }
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
  await router.push(`/admin/lojas/${id}`)
}

onMounted(refresh)
</script>

<style scoped>
ion-searchbar {
  --box-shadow: none;
}
</style>
