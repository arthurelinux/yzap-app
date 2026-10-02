<template>
  <ion-page>
    <AppBar back />
    <ion-content class="ion-padding">
      <PageHead title="Categorias" sub="Meu catálogo" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando categorias…</p>
      </div>

      <ion-text v-else-if="loadError" color="danger">
        <div class="yz-state">
          <ion-icon name="grid-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else>
        <ion-list v-if="categories.length" lines="full" class="card">
          <ion-item v-for="(cat, index) in categories" :key="cat.id">
            <ion-label>
              <h3>
                {{ cat.name }}
                <ion-badge :color="cat.is_active === false ? 'medium' : 'success'">
                  {{ cat.is_active === false ? 'oculta' : 'visível' }}
                </ion-badge>
              </h3>
              <p>{{ cat.products_count ?? 0 }} produtos</p>
            </ion-label>
            <ion-button
              slot="end"
              size="small"
              fill="clear"
              :disabled="index === 0 || saving"
              @click="move(index, -1)"
            >
              <ion-icon name="chevron-down-outline" :style="{ transform: 'rotate(180deg)' }"></ion-icon>
            </ion-button>
            <ion-button
              slot="end"
              size="small"
              fill="clear"
              :disabled="index === categories.length - 1 || saving"
              @click="move(index, 1)"
            >
              <ion-icon name="chevron-down-outline"></ion-icon>
            </ion-button>
            <ion-button slot="end" size="small" fill="clear" @click="edit(cat)">
              <ion-icon name="create-outline"></ion-icon>
            </ion-button>
            <ion-button slot="end" size="small" fill="clear" color="danger" @click="remove(cat)">
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>

        <div v-else class="yz-state">
          <ion-icon name="grid-outline"></ion-icon>
          <h3>Nenhuma categoria</h3>
          <p>Crie a primeira para organizar seus produtos.</p>
        </div>
      </template>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="yz-fab">
        <ion-fab-button @click="create">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>

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
  alertController,
  IonBadge,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { catalogApi, type Category } from '@/api/products'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()
const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await catalogApi.categories()
    categories.value = data ?? []
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    loading.value = false
  }
}

let pendingName: string | null = null

async function promptName(title: string, initial = ''): Promise<string | null> {
  const alert = await alertController.create({
    header: title,
    inputs: [{ name: 'name', type: 'text', value: initial, placeholder: 'Nome da categoria' }],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Salvar',
        handler: (data: { name?: string }) => {
          const value = (data.name ?? '').trim()
          if (!value) {
            toast('Informe um nome.')
            return false
          }
          pendingName = value
          return true
        },
      },
    ],
  })
  await alert.present()
  await alert.onDidDismiss()
  const out = pendingName
  pendingName = null
  return out
}

async function create() {
  const name = await promptName('Nova categoria')
  if (!name) return
  saving.value = true
  try {
    const { data } = await catalogApi.createCategory({ name })
    categories.value.push(data)
    toast('Categoria criada.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

async function edit(cat: Category) {
  const name = await promptName('Editar categoria', cat.name)
  if (!name || name === cat.name) return
  saving.value = true
  try {
    const { data } = await catalogApi.updateCategory(cat.id, { name })
    const i = categories.value.findIndex((c) => c.id === cat.id)
    if (i >= 0) categories.value[i] = data
    toast('Categoria atualizada.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(cat: Category) {
  const alert = await alertController.create({
    header: `Excluir "${cat.name}"?`,
    message: 'Produtos desta categoria ficam sem categoria.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Excluir',
        role: 'destructive',
        handler: () => {
          void doRemove(cat)
          return true
        },
      },
    ],
  })
  await alert.present()
}

async function doRemove(cat: Category) {
  saving.value = true
  try {
    await catalogApi.removeCategory(cat.id)
    categories.value = categories.value.filter((c) => c.id !== cat.id)
    toast('Categoria excluída.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

/** PATCH /categories/reorder exige TODOS os ids da loja (senão 403). */
async function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= categories.value.length) return
  const next = [...categories.value]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  const previous = categories.value
  categories.value = next
  saving.value = true
  try {
    await catalogApi.reorderCategories(next.map((c) => c.id))
  } catch (e: unknown) {
    categories.value = previous
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.card {
  background: var(--ion-card-background);
  border-radius: 13px;
  overflow: hidden;
}
</style>
