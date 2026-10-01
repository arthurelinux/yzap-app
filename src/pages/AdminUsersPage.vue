<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Usuários" sub="Administração" />

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar por nome ou e-mail"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando usuários…</p>
      </div>

      <ion-text v-else-if="list.error && !list.items.length" color="danger">
        <div class="yz-state">
          <ion-icon name="people-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ list.error }}</p>
          <ion-button fill="outline" @click="refresh">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="list.items.length" lines="full">
          <ion-item
            v-for="user in list.items"
            :key="user.id"
            :button="true"
            detail
            @click="open(user.id)"
          >
            <div class="avatar-a" slot="start">
              {{ (user.name || '?').charAt(0).toUpperCase() }}
            </div>
            <ion-label>
              <h3>{{ user.name }}</h3>
              <p>
                {{ user.email }}
                <template v-if="user.plan"> · {{ user.plan.name }}</template>
                <template v-if="user.is_super_admin"> · super-admin</template>
              </p>
            </ion-label>
            <ion-badge
              slot="end"
              :color="user.is_active === false ? 'medium' : 'success'"
            >
              {{ user.is_active === false ? 'inativo' : 'ativo' }}
            </ion-badge>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="people-outline"></ion-icon>
          <h3>Nenhum usuário encontrado</h3>
          <p>Tente outro nome ou e-mail.</p>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
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
  IonToast,
} from '@ionic/vue'
import { adminApi } from '@/api/admin'
import { routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const search = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const list = useList((page: number) =>
  adminApi.users({ page, per_page: 20, search: search.value.trim() || undefined }),
)

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function refresh() {
  try {
    await list.refresh()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast('Não foi possível carregar os usuários.')
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
  await router.push(`/admin/usuarios/${id}`)
}

onMounted(refresh)
</script>

<style scoped>
ion-searchbar {
  --box-shadow: none;
}
</style>
