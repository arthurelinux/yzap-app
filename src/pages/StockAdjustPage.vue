<template>
  <ion-page>
    <AppBar back back-href="/estoque" />
    <ion-content class="ion-padding">
      <PageHead title="Ajustar estoque" :sub="productName" />

      <div class="yz-chips">
        <ion-chip :color="form.type === 'adjustment_in' ? 'success' : ''" @click="form.type = 'adjustment_in'">
          <ion-icon name="arrow-up-circle-outline"></ion-icon>
          <ion-label>Entrada</ion-label>
        </ion-chip>
        <ion-chip :color="form.type === 'adjustment_out' ? 'danger' : ''" @click="form.type = 'adjustment_out'">
          <ion-icon name="arrow-down-circle-outline"></ion-icon>
          <ion-label>Saída</ion-label>
        </ion-chip>
      </div>

      <form @submit.prevent="submit">
        <ion-list lines="full" class="card">
          <ion-item v-if="variants.length">
            <ion-label position="stacked">Variante *</ion-label>
            <ion-select
              :value="form.variant_id"
              interface="action-sheet"
              placeholder="Selecione a variante"
              @ionChange="form.variant_id = Number($event.detail?.value) || null"
            >
              <ion-select-option v-for="v in variants" :key="v.id" :value="v.id">
                {{ v.code || `Variante ${v.id}` }} — saldo {{ v.stock ?? 0 }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Quantidade *</ion-label>
            <ion-input
              v-model="form.quantity"
              inputmode="decimal"
              placeholder="ex.: 10"
            ></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Motivo *</ion-label>
            <ion-input
              v-model="form.reason"
              placeholder="ex.: reposição, perda, contagem"
              :maxlength="255"
            ></ion-input>
          </ion-item>
        </ion-list>

        <p class="hint">
          O ajuste vira um movimento <strong>imutável</strong> no histórico (nunca é editado)
          e o saldo nunca fica negativo.
        </p>

        <div class="yz-actions">
          <ion-button type="submit" :disabled="busy">
            <ion-spinner v-if="busy" name="crescent"></ion-spinner>
            Registrar ajuste
          </ion-button>
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
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton,
  IonChip,
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
  IonToast,
} from '@ionic/vue'
import { stockApi } from '@/api/stock'
import { catalogApi, type ProductVariant } from '@/api/products'
import { apiMessage, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)
const productName = String(route.query.name ?? 'Produto')

const form = reactive({
  type: 'adjustment_in' as 'adjustment_in' | 'adjustment_out',
  quantity: '',
  reason: '',
  variant_id: null as number | null,
})
const variants = ref<ProductVariant[]>([])
const busy = ref(false)
const toastOpen = ref(false)
const toastMessage = ref('')

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

/** Produto com variantes EXIGE variant_id ativo (422 no servidor sem isso). */
async function loadVariants() {
  try {
    const { data } = await catalogApi.product(id)
    if (data.uses_variants) {
      const res = await catalogApi.variants(id)
      variants.value = (res.data.variants ?? []).filter((v) => v.is_active !== false)
    }
  } catch {
    /* sem variantes ou sem permissão de products: segue sem select */
  }
}

async function submit() {
  const quantity = Number(form.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    toast('Informe uma quantidade maior que zero.')
    return
  }
  if (!form.reason.trim()) {
    toast('Informe o motivo do ajuste.')
    return
  }
  if (variants.value.length && !form.variant_id) {
    toast('Selecione a variante.')
    return
  }
  busy.value = true
  try {
    const { data } = await stockApi.adjust(id, {
      type: form.type,
      quantity,
      reason: form.reason.trim(),
      variant_id: form.variant_id,
    })
    toast(
      `${form.type === 'adjustment_in' ? 'Entrada' : 'Saída'} de ${data.quantity} registrada — saldo ${data.balance_after}.`,
    )
    await router.replace('/estoque')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    busy.value = false
  }
}

onMounted(loadVariants)
</script>

<style scoped>
.card {
  background: var(--ion-card-background);
  border-radius: 13px;
  overflow: hidden;
}
.hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--yz-muted);
  line-height: 1.6;
}
</style>
