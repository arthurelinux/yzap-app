<template>
  <ion-page>
    <AppBar />
    <ion-content class="ion-padding">
      <PageHead title="Clientes" sub="Minha loja" />

      <div class="yz-toolbar-row">
        <ion-searchbar
          v-model="search"
          placeholder="Buscar por nome ou telefone"
          :debounce="350"
          @ionInput="refresh"
        ></ion-searchbar>
        <ion-button size="small" fill="outline" @click="openLookup">
          <ion-icon slot="start" name="call-outline"></ion-icon>Telefone
        </ion-button>
      </div>

      <div v-if="list.busy && !list.items.length" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando clientes…</p>
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
            v-for="customer in list.items"
            :key="customer.id"
            :button="true"
            detail
            @click="open(customer.id)"
          >
            <div class="avatar-a" slot="start">
              {{ (customer.name || '?').charAt(0).toUpperCase() }}
            </div>
            <ion-label>
              <h3>{{ customer.name }}</h3>
              <p>
                {{ customer.phone }} · {{ customer.orders_count }}
                {{ customer.orders_count === 1 ? 'pedido' : 'pedidos' }}
              </p>
            </ion-label>
            <ion-note slot="end" class="price">{{ money(customer.total_spent) }}</ion-note>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="people-outline"></ion-icon>
          <h3>{{ search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda' }}</h3>
          <p>{{ search ? 'Tente outro nome ou telefone.' : 'Cadastre o primeiro cliente.' }}</p>
          <ion-button router-link="/clientes/novo">Cadastrar cliente</ion-button>
        </div>

        <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </template>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="yz-fab">
        <ion-fab-button router-link="/clientes/novo">
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
  alertController,
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
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { customersApi } from '@/api/customers'
import { apiMessage, routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const search = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

const list = useList((page: number) =>
  customersApi.list({ page, per_page: 20, search: search.value.trim() || undefined }),
)

function money(value: number): string {
  try {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  await router.push(`/clientes/${id}`)
}

/** Lookup real: GET /customers/lookup?phone= — 404 → cadastrar novo. */
async function lookupAndGo(rawPhone: string) {
  const phone = (rawPhone ?? '').replace(/\D/g, '')
  if (phone.length < 8) {
    toast('Informe um telefone válido.')
    return
  }
  try {
    const { data } = await customersApi.lookup(phone)
    await router.push(`/clientes/${data.id}`)
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 404) {
      await router.push({ path: '/clientes/novo', query: { phone } })
      toast('Cliente não encontrado — cadastrando agora.')
      return
    }
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  }
}

async function openLookup() {
  const alert = await alertController.create({
    header: 'Buscar por telefone',
    message: 'Informe o telefone (com ou sem máscara).',
    inputs: [{ name: 'phone', type: 'tel', placeholder: '11999998888' }],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Buscar',
        handler: (data: { phone?: string }) => {
          void lookupAndGo(data.phone ?? '')
          return true
        },
      },
    ],
  })
  await alert.present()
}

onMounted(refresh)
</script>

<style scoped>
ion-searchbar {
  --box-shadow: none;
}
</style>
