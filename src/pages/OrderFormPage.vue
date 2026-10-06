<template>
  <ion-page>
    <AppBar back back-href="/pedidos" />
    <ion-content class="ion-padding">
      <!-- Pedido avulso em 2 passos, igual ao painel (`CatalogOrderController`):
        1. identificação do cliente (`POST /orders` → draft) · 2. itens do
        catálogo (`PATCH /orders/{id}/items`) → revisar/enviar (status). -->
      <PageHead title="Novo pedido avulso" sub="Pedidos" />

      <ol class="steps">
        <li :class="{ active: step === 'cliente', done: step !== 'cliente' }">Cliente</li>
        <li :class="{ active: step === 'itens', done: step === 'revisar' }">Produtos</li>
        <li :class="{ active: step === 'revisar' }">Revisar</li>
      </ol>

      <!-- Passo 1 — identificação (espelha `orders/create.blade.php`). -->
      <template v-if="step === 'cliente'">
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>1. Identificação do cliente</h2>
            <p class="muted">
              Escolha um cliente existente ou informe somente o nome para iniciar o pedido.
            </p>

            <div v-if="selectedCustomer" class="picked">
              <div class="avatar-a">{{ (selectedCustomer.name || '?').charAt(0).toUpperCase() }}</div>
              <ion-label>
                <h3>{{ selectedCustomer.name }}</h3>
                <p>{{ selectedCustomer.phone }}</p>
              </ion-label>
              <ion-button size="small" fill="clear" @click="clearCustomer">Trocar</ion-button>
            </div>
            <template v-else>
              <ion-searchbar
                v-model="customerSearch"
                placeholder="Buscar cliente cadastrado"
                :debounce="350"
                @ionInput="searchCustomers"
              ></ion-searchbar>
              <ion-list v-if="customerResults.length" lines="full" class="pick-list">
                <ion-item
                  v-for="c in customerResults"
                  :key="c.id"
                  :button="true"
                  @click="pickCustomer(c)"
                >
                  <div class="avatar-a" slot="start">
                    {{ (c.name || '?').charAt(0).toUpperCase() }}
                  </div>
                  <ion-label>
                    <h3>{{ c.name }}</h3>
                    <p>{{ c.phone }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>
              <p v-else-if="customerSearch.trim()" class="hint">
                Nenhum cliente encontrado — informe o nome abaixo para pedido sem cadastro.
              </p>
            </template>

            <div class="yz-form-grid ion-margin-top">
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.customer_name" label="Nome do cliente" label-placement="floating" />
              </ion-item>
              <p v-if="err('customer_name') || err('customer_id')" class="err-text full">
                {{ err('customer_name') ?? err('customer_id') }}
              </p>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.customer_phone"
                  label="WhatsApp (opcional)"
                  label-placement="floating"
                  inputmode="tel"
                />
              </ion-item>
              <p v-if="err('customer_phone')" class="err-text full">{{ err('customer_phone') }}</p>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.customer_postal_code"
                  label="CEP (opcional)"
                  label-placement="floating"
                  inputmode="numeric"
                />
              </ion-item>
              <p v-if="err('customer_postal_code')" class="err-text full">
                {{ err('customer_postal_code') }}
              </p>
              <ion-item lines="full" class="yz-field full">
                <ion-input v-model="form.customer_address" label="Rua / avenida" label-placement="floating" />
              </ion-item>
              <p v-if="err('customer_address')" class="err-text full">{{ err('customer_address') }}</p>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.customer_address_number" label="Número" label-placement="floating" />
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.customer_address_complement" label="Complemento" label-placement="floating" />
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.customer_neighborhood" label="Bairro" label-placement="floating" />
              </ion-item>
              <p v-if="err('customer_neighborhood')" class="err-text full">
                {{ err('customer_neighborhood') }}
              </p>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.customer_city_name" label="Cidade" label-placement="floating" />
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.customer_state_code"
                  label="UF"
                  label-placement="floating"
                  :maxlength="2"
                />
              </ion-item>
              <p v-if="err('customer_state_code')" class="err-text full">
                {{ err('customer_state_code') }}
              </p>
              <ion-item lines="full" class="yz-field full">
                <ion-textarea
                  v-model="form.customer_notes"
                  label="Observação (opcional)"
                  label-placement="floating"
                  placeholder="Ex.: sem cebola, troco para R$ 100"
                  :rows="2"
                  auto-grow
                  :maxlength="1000"
                  :counter="true"
                ></ion-textarea>
              </ion-item>
              <p v-if="err('customer_notes')" class="err-text full">{{ err('customer_notes') }}</p>
            </div>

            <p v-if="saveError" class="err-text">{{ saveError }}</p>
            <ion-button expand="block" :disabled="saving" @click="createDraftOrder">
              {{ saving ? 'Salvando…' : 'Continuar para os produtos' }}
            </ion-button>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- Passo 2 — itens do catálogo (equivale ao `edit` do pedido no painel). -->
      <template v-else-if="step === 'itens'">
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>2. Adicionar produtos</h2>
            <p class="muted">
              Pedido <strong class="mono">#{{ draft?.number }}</strong> em rascunho — escolha
              produtos, quantidades e variantes.
            </p>
            <ion-searchbar
              v-model="productSearch"
              placeholder="Buscar produto no catálogo"
              :debounce="350"
              @ionInput="searchProducts"
            ></ion-searchbar>
            <ion-list v-if="productResults.length" lines="full" class="pick-list">
              <ion-item v-for="p in productResults" :key="p.id">
                <ion-label>
                  <h3>{{ p.name }}</h3>
                  <p>{{ money(effectivePrice(p)) }} · {{ p.category_name || 'sem categoria' }}</p>
                  <div v-if="p.uses_variants" class="variant-row">
                    <ion-select
                      :value="variantSel[p.id] ?? ''"
                      interface="action-sheet"
                      placeholder="Escolher variante"
                      @ionChange="onVariant(p.id, $event)"
                    >
                      <ion-select-option value="">Padrão</ion-select-option>
                      <ion-select-option v-for="v in variantOptions[p.id] ?? []" :key="v.id" :value="v.id">
                        {{ v.code || `Variação #${v.id}` }} · {{ money(v.promotional_price ?? v.price ?? 0) }}
                      </ion-select-option>
                    </ion-select>
                  </div>
                </ion-label>
                <div slot="end" class="qty-add">
                  <ion-input
                    v-model="qtyDraft[p.id]"
                    type="number"
                    min="1"
                    aria-label="Quantidade"
                    class="qty"
                  ></ion-input>
                  <ion-button size="small" @click="addItem(p)">
                    <ion-icon slot="start" name="add-outline"></ion-icon>Adicionar
                  </ion-button>
                </div>
              </ion-item>
            </ion-list>
            <p v-else-if="productSearch.trim() && !productsBusy" class="hint">
              Nenhum produto encontrado no catálogo.
            </p>

            <h2 class="ion-margin-top">Itens do pedido ({{ items.length }})</h2>
            <ion-list v-if="items.length" lines="full">
              <ion-item v-for="(it, i) in items" :key="`${it.product_id}-${it.variant_id ?? 0}`">
                <ion-label>
                  <h3>{{ it.quantity }}× {{ it.label }}</h3>
                  <p>{{ money(it.unit) }} cada</p>
                </ion-label>
                <ion-button slot="end" size="small" fill="clear" color="danger" @click="items.splice(i, 1)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              </ion-item>
            </ion-list>
            <p v-else class="hint">Nenhum item ainda — adicione pelo catálogo acima.</p>

            <!-- Observação: PATCH /orders/{id}/items aceita `customer_notes`
              (ausente mantém); aqui o lojista vê/edita antes de revisar. -->
            <ion-item lines="full" class="yz-field ion-margin-top">
              <ion-textarea
                v-model="form.customer_notes"
                label="Observação do pedido"
                label-placement="floating"
                placeholder="Ex.: sem cebola, troco para R$ 100"
                :rows="2"
                auto-grow
                :maxlength="1000"
                :counter="true"
              ></ion-textarea>
            </ion-item>
            <p v-if="err('customer_notes')" class="err-text">{{ err('customer_notes') }}</p>

            <p v-if="saveError" class="err-text">{{ saveError }}</p>
            <div class="yz-actions">
              <ion-button fill="outline" @click="step = 'cliente'">Voltar</ion-button>
              <ion-button :disabled="saving || !items.length" @click="saveItems">
                {{ saving ? 'Salvando…' : 'Salvar itens e revisar' }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- Passo 3 — revisar/enviar (o PATCH de itens já virou `received`; aqui o
        lojista confirma — mesma máquina de status do detalhe do pedido). -->
      <template v-else>
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>3. Revisar e enviar</h2>
            <p class="muted">
              Pedido <strong class="mono">#{{ review?.number }}</strong> ·
              {{ review?.customer?.name || 'Cliente' }}
            </p>
            <ion-list lines="full">
              <ion-item v-for="(item, i) in review?.items ?? []" :key="i">
                <ion-label>
                  <h3>{{ item.quantity }}× {{ item.name || item.product_name }}</h3>
                  <p v-if="item.variant_name">{{ item.variant_name }}</p>
                </ion-label>
                <ion-note slot="end" class="price">{{ money(item.subtotal ?? 0) }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Total do pedido</ion-label>
                <ion-note slot="end" class="price">{{ money(review?.total ?? 0) }}</ion-note>
              </ion-item>
              <ion-item v-if="review?.customer_notes" lines="none">
                <ion-label>
                  <h3>Observação</h3>
                  <p class="notes">{{ review.customer_notes }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <p v-if="saveError" class="err-text">{{ saveError }}</p>
            <div class="yz-actions">
              <ion-button fill="outline" @click="openDraft">Ver pedido</ion-button>
              <ion-button :disabled="saving" @click="confirmOrder">
                {{ saving ? 'Enviando…' : 'Confirmar pedido' }}
              </ion-button>
            </div>
            <p class="hint">
              Confirmar baixa o estoque e avisa o cliente no WhatsApp (igual ao painel).
            </p>
          </ion-card-content>
        </ion-card>
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
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToast,
} from '@ionic/vue'
import { ordersApi, type Order } from '@/api/orders'
import { catalogApi, type Product, type ProductVariant } from '@/api/products'
import { customersApi, type Customer } from '@/api/customers'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()

type Step = 'cliente' | 'itens' | 'revisar'
const step = ref<Step>('cliente')
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const saveError = ref<string | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

/* ---------- Passo 1: cliente ---------- */
const customerSearch = ref('')
const customerResults = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)

const form = reactive({
  customer_name: '',
  customer_phone: '',
  customer_postal_code: '',
  customer_address: '',
  customer_address_number: '',
  customer_address_complement: '',
  customer_neighborhood: '',
  customer_city_name: '',
  customer_state_code: '',
  customer_notes: '',
})

const draft = ref<Order | null>(null)

function err(key: string): string | null {
  return errors.value[key]?.[0] ?? null
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function searchCustomers() {
  const term = customerSearch.value.trim()
  if (!term) {
    customerResults.value = []
    return
  }
  try {
    const res = await customersApi.list({ search: term, per_page: 8 })
    customerResults.value = res.data ?? []
  } catch {
    customerResults.value = []
  }
}

/** Cliente existente (lookup/CRUD já prontos): preenche e vincula `customer_id`. */
function pickCustomer(c: Customer) {
  selectedCustomer.value = c
  customerResults.value = []
  customerSearch.value = ''
  form.customer_name = c.name ?? ''
  form.customer_phone = c.phone ?? ''
  form.customer_postal_code = c.postal_code ?? ''
  form.customer_address = c.street ?? c.address ?? ''
  form.customer_address_number = c.number ?? ''
  form.customer_address_complement = c.complement ?? ''
  form.customer_neighborhood = c.neighborhood ?? ''
  form.customer_city_name = c.city ?? ''
  form.customer_state_code = c.state ?? ''
}

function clearCustomer() {
  selectedCustomer.value = null
}

/** POST /orders com `Idempotency-Key` (gerado no módulo da API). */
async function createDraftOrder() {
  saving.value = true
  saveError.value = null
  errors.value = {}
  const clean = (v: string) => v.trim()
  const opt = (v: string) => (v.trim() === '' ? undefined : v.trim())
  try {
    const { data } = await ordersApi.createDraft({
      customer_id: selectedCustomer.value?.id ?? undefined,
      customer_name: clean(form.customer_name) || undefined,
      customer_phone: opt(form.customer_phone),
      // CEP só dígitos + UF maiúscula (igual ao `normalize` do painel).
      customer_postal_code: opt(form.customer_postal_code)?.replace(/\D/g, ''),
      customer_address: opt(form.customer_address),
      customer_address_number: opt(form.customer_address_number),
      customer_address_complement: opt(form.customer_address_complement),
      customer_neighborhood: opt(form.customer_neighborhood),
      customer_city_name: opt(form.customer_city_name),
      customer_state_code: opt(form.customer_state_code)?.toUpperCase(),
      customer_notes: opt(form.customer_notes),
    })
    draft.value = data
    step.value = 'itens'
    toast('Identificação salva — agora adicione os produtos.')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    errors.value = fieldErrors(e)
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

/* ---------- Passo 2: itens ---------- */
interface DraftItem {
  product_id: number
  variant_id: number | null
  quantity: number
  label: string
  unit: number
}

const productSearch = ref('')
const productResults = ref<Product[]>([])
const productsBusy = ref(false)
const variantOptions = ref<Record<number, ProductVariant[]>>({})
const variantSel = ref<Record<number, number | ''>>({})
const qtyDraft = ref<Record<number, string>>({})
const items = ref<DraftItem[]>([])

function money(value: number | string): string {
  try {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function effectivePrice(p: Product): number {
  const promo = Number(p.promotional_price ?? 0)
  if (promo > 0) return promo
  return Number(p.price ?? 0)
}

async function searchProducts() {
  const term = productSearch.value.trim()
  if (!term) {
    productResults.value = []
    return
  }
  productsBusy.value = true
  try {
    const res = await catalogApi.products({ search: term, per_page: 8, is_active: true })
    productResults.value = res.data ?? []
    // Variantes são somente leitura no v1: carrega as opções de quem usa.
    for (const p of productResults.value) {
      if (p.uses_variants && !variantOptions.value[p.id]) {
        try {
          const v = await catalogApi.variants(p.id)
          variantOptions.value[p.id] = (v.data?.variants ?? []).filter((x) => x.is_active !== false)
        } catch {
          variantOptions.value[p.id] = []
        }
      }
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    productResults.value = []
  } finally {
    productsBusy.value = false
  }
}

function onVariant(productId: number, event: CustomEvent) {
  const raw = event.detail?.value
  variantSel.value[productId] = raw === '' || raw === undefined ? '' : Number(raw)
}

function addItem(p: Product) {
  const qty = Math.max(1, Math.floor(Number(qtyDraft.value[p.id] ?? 1) || 1))
  const sel = variantSel.value[p.id]
  const variant =
    p.uses_variants && typeof sel === 'number'
      ? (variantOptions.value[p.id] ?? []).find((v) => v.id === sel)
      : undefined
  const unit = variant ? Number(variant.promotional_price ?? variant.price ?? 0) || effectivePrice(p) : effectivePrice(p)
  const label = variant ? `${p.name} (${variant.code || `variação #${variant.id}`})` : p.name
  const existing = items.value.find(
    (it) => it.product_id === p.id && (it.variant_id ?? null) === (variant?.id ?? null),
  )
  if (existing) {
    existing.quantity += qty
  } else {
    items.value.push({
      product_id: p.id,
      variant_id: variant?.id ?? null,
      quantity: qty,
      label,
      unit,
    })
  }
  qtyDraft.value[p.id] = ''
  toast(`${qty}× ${label} no pedido.`)
}

/** PATCH /orders/{id}/items com `Idempotency-Key` (mesmo cálculo/reserva do painel). */
const review = ref<Order | null>(null)

async function saveItems() {
  if (!draft.value || !items.value.length) return
  saving.value = true
  saveError.value = null
  errors.value = {}
  try {
    const { data } = await ordersApi.updateItems(
      draft.value.id,
      items.value.map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id,
        quantity: it.quantity,
      })),
      // Observação vai junto (ausente manteria; aqui o lojista vê/edita).
      { customer_notes: form.customer_notes.trim() },
    )
    review.value = data
    step.value = 'revisar'
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    errors.value = fieldErrors(e)
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

/* ---------- Passo 3: revisar/enviar ---------- */
async function confirmOrder() {
  if (!draft.value) return
  saving.value = true
  saveError.value = null
  try {
    await ordersApi.setStatus(draft.value.id, 'confirmed')
    toast('Pedido confirmado.')
    await router.replace(`/pedidos/${draft.value.id}`)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

async function openDraft() {
  if (draft.value) await router.replace(`/pedidos/${draft.value.id}`)
}
</script>

<style scoped>
.steps {
  display: flex;
  gap: 8px;
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
}
.steps li {
  flex: 1 1 0;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--yz-muted);
  background: var(--yz-card);
  border: 1px solid var(--yz-mist);
  border-radius: 99px;
  padding: 8px 4px;
}
.steps li.active {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.steps li.done {
  color: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}
.panel-card h2 {
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ion-text-color);
}
.panel-card p.muted {
  margin: 0 0 12px;
  font-size: 0.88rem;
}
.pick-list {
  background: var(--ion-card-background);
  border-radius: 13px;
  margin-top: 8px;
}
.picked {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--yz-mint);
  border-radius: 13px;
  padding: 8px 8px 8px 12px;
  margin-bottom: 4px;
}
.picked ion-label {
  flex: 1 1 auto;
  color: var(--ion-text-color);
}
.qty-add {
  display: flex;
  align-items: center;
  gap: 6px;
}
.qty {
  width: 64px;
  text-align: center;
  border: 1px solid var(--yz-mist);
  border-radius: 10px;
  --padding-start: 6px;
  color: var(--ion-text-color);
}
.variant-row {
  margin-top: 6px;
  max-width: 240px;
}
.err-text.full {
  grid-column: 1 / -1;
}
.hint {
  font-size: 0.82rem;
  color: var(--yz-muted);
  margin: 8px 0;
}
.notes {
  white-space: pre-wrap;
}
ion-searchbar {
  --box-shadow: none;
  padding: 0;
}
</style>
