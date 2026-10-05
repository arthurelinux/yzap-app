<template>
  <ion-page>
    <AppBar back back-href="/inicio" />
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <PageHead title="Indicar e ganhar" sub="Programa de afiliados" />

      <div v-if="busy && !header" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando programa…</p>
      </div>

      <ion-text v-else-if="loadError && !header" color="danger">
        <div class="yz-state">
          <ion-icon name="gift-outline"></ion-icon>
          <h3>Não foi possível carregar</h3>
          <p>{{ loadError }}</p>
          <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
        </div>
      </ion-text>

      <template v-else-if="header">
        <!-- Link + código (espelha `affiliates/index.blade.php`: link readonly +
          copiar). Compartilhar usa o share nativo quando há (`navigator.share`,
          que no Capacitor abre o sheet do sistema) e cai no clipboard. -->
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>Seu link de indicação</h2>
            <p class="muted">
              Compartilhe este link para que novos cadastros sejam vinculados a você.
            </p>
            <div class="url-row">
              <ion-input readonly :value="header.link" aria-label="Seu link de indicação"></ion-input>
              <ion-button class="btn-copy" fill="outline" @click="copyLink">Copiar</ion-button>
              <ion-button class="btn-open" @click="share">
                <ion-icon slot="start" name="share-social-outline"></ion-icon>Enviar
              </ion-button>
            </div>
            <div class="code-row">
              <span class="muted">Seu código:</span>
              <strong class="mono">{{ header.code }}</strong>
              <ion-button size="small" fill="clear" @click="copyCode">
                <ion-icon slot="icon-only" name="copy-outline"></ion-icon>
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Stats reais de GET /affiliates (contrato § grupo 11). -->
        <div class="stat-grid aff-stats">
          <ion-card v-for="card in statCards" :key="card.label" class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">{{ card.label }}</p>
                <p class="stat-num" :class="{ small: card.small }">{{ card.value }}</p>
              </div>
              <div class="icon-chip" :class="card.chip">
                <ion-icon :name="card.icon"></ion-icon>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Dados para recebimento (PUT /affiliates/payout, contrato § grupo 11
          — só `auth`, sem `active`, como o GET). O GET traz os sensíveis
          MASCARADOS (**** + últimos dígitos) — o form pré-preenche marcando a
          proteção; a confirmação do PUT nunca exibe dado sensível. -->
        <ion-card class="panel-card">
          <ion-card-content>
            <div class="row-between">
              <h2>Dados para recebimento</h2>
              <ion-badge :color="payout?.configured ? 'success' : 'warning'">
                {{ payout?.configured ? 'Cadastrados' : 'Pendente' }}
              </ion-badge>
            </div>
            <p class="muted payout-note">
              <ion-icon name="lock-closed-outline"></ion-icon>
              <span>
                Documento, chave Pix, agência, conta e dígito aparecem protegidos
                (****). Para alterar, apague o campo e digite o valor completo —
                o dado real nunca é exibido aqui.
              </span>
            </p>

            <div v-if="payoutSaved" class="payout-ok" role="status">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <p>{{ payoutSaved }}</p>
            </div>

            <form @submit.prevent="savePayout">
              <div class="yz-form-grid">
                <ion-item lines="full" class="yz-field full">
                  <ion-input
                    v-model="payoutForm.holder"
                    label="Titular da conta"
                    label-placement="floating"
                    autocomplete="name"
                    @ionInput="markPayoutDirty"
                  />
                  <p v-if="perr('holder')" class="err-text">{{ perr('holder') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field full">
                  <ion-input
                    :value="payoutForm.document"
                    label="CPF/CNPJ do titular"
                    label-placement="floating"
                    inputmode="numeric"
                    @ionInput="onDocumentInput($event)"
                  />
                  <p v-if="perr('document')" class="err-text">{{ perr('document') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field full">
                  <ion-select
                    v-model="payoutForm.pix_key_type"
                    label="Tipo de chave Pix"
                    label-placement="floating"
                    interface="popover"
                    @ionChange="onPixTypeChange"
                  >
                    <ion-select-option value="cpf">CPF</ion-select-option>
                    <ion-select-option value="cnpj">CNPJ</ion-select-option>
                    <ion-select-option value="email">E-mail</ion-select-option>
                    <ion-select-option value="phone">Celular</ion-select-option>
                    <ion-select-option value="random">Aleatória</ion-select-option>
                  </ion-select>
                  <p v-if="perr('pix_key_type')" class="err-text">{{ perr('pix_key_type') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field full">
                  <ion-input
                    :value="payoutForm.pix_key"
                    :label="pixKeyLabel"
                    label-placement="floating"
                    :inputmode="pixKeyInputMode"
                    @ionInput="onPixKeyInput($event)"
                  />
                  <p class="hint">{{ pixKeyHint }}</p>
                  <p v-if="perr('pix_key')" class="err-text">{{ perr('pix_key') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field full">
                  <ion-input
                    v-model="payoutForm.bank"
                    label="Banco"
                    label-placement="floating"
                    @ionInput="markPayoutDirty"
                  />
                  <p v-if="perr('bank')" class="err-text">{{ perr('bank') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="payoutForm.branch"
                    label="Agência"
                    label-placement="floating"
                    inputmode="numeric"
                    @ionInput="markPayoutDirty"
                  />
                  <p v-if="perr('branch')" class="err-text">{{ perr('branch') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="payoutForm.account"
                    label="Conta"
                    label-placement="floating"
                    inputmode="numeric"
                    @ionInput="markPayoutDirty"
                  />
                  <p v-if="perr('account')" class="err-text">{{ perr('account') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="payoutForm.account_digit"
                    label="Dígito (se houver)"
                    label-placement="floating"
                    inputmode="numeric"
                    :maxlength="5"
                    @ionInput="markPayoutDirty"
                  />
                  <p v-if="perr('account_digit')" class="err-text">{{ perr('account_digit') }}</p>
                </ion-item>
              </div>

              <p v-if="payoutError" class="err-text">{{ payoutError }}</p>
              <ion-button expand="block" type="submit" :disabled="payoutSaving">
                {{ payoutSaving ? 'Salvando…' : 'Salvar dados de recebimento' }}
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <!-- Como funciona: regras vindas da API (espelham a lista "Regras do
          programa" de `affiliates/index.blade.php` via `AffiliateProgramContent`). -->
        <ion-card v-if="header.how_it_works?.length" class="panel-card">
          <ion-card-content>
            <h2>Como funciona</h2>
            <ol class="rules">
              <li v-for="rule in header.how_it_works" :key="rule.title">
                <strong>{{ rule.title }}.</strong>
                {{ rule.text }}
              </li>
            </ol>
          </ion-card-content>
        </ion-card>

        <!-- Minhas indicações (só nome + assinatura/comissão — igual à visão
          não-admin do painel; sem dados de terceiros). -->
        <ion-card class="panel-card">
          <ion-card-content>
            <h2>Minhas indicações</h2>
            <div v-if="list.busy && !list.items.length" class="yz-state">
              <ion-spinner name="dots"></ion-spinner>
            </div>
            <ion-list v-else-if="list.items.length" lines="full">
              <ion-item v-for="ref in list.items" :key="ref.id">
                <div class="avatar-a" slot="start">
                  {{ (ref.referred_name || '?').charAt(0).toUpperCase() }}
                </div>
                <ion-label>
                  <h3>
                    {{ ref.referred_name }}
                    <ion-badge :color="referralColor(ref.status)">
                      {{ ref.status_label }}
                    </ion-badge>
                  </h3>
                  <p>
                    <template v-if="ref.subscription">
                      {{ ref.subscription.plan }} ·
                      {{ money(ref.subscription.amount) }}
                    </template>
                    <template v-else>Sem assinatura ainda</template>
                    <template v-if="ref.trial_ends_at">
                      · teste até {{ dateShort(ref.trial_ends_at) }}
                    </template>
                  </p>
                </ion-label>
                <ion-note slot="end" class="price">
                  {{ ref.commission !== null ? money(ref.commission) : '—' }}
                </ion-note>
              </ion-item>
            </ion-list>
            <div v-else class="yz-state">
              <ion-icon name="people-outline"></ion-icon>
              <h3>Nenhuma indicação ainda</h3>
              <p>Compartilhe seu link para começar a ganhar.</p>
            </div>
            <ion-infinite-scroll :disabled="!list.hasMore" @ionInfinite="onInfinite">
              <ion-infinite-scroll-content></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          </ion-card-content>
        </ion-card>
      </template>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="1800"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import {
  affiliatesApi,
  type AffiliatePage,
  type PixKeyType,
  type Referral,
  type ReferralStatus,
} from '@/api/affiliates'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'
import { useList } from '@/composables/useList'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'

const router = useRouter()

/** Cabeçalho do programa (link/código/regras/stats) — mesma página em todas as páginas. */
const header = ref<AffiliatePage | null>(null)
const busy = ref(false)
const loadError = ref('')
const toastOpen = ref(false)
const toastMessage = ref('')

/** Indicações paginadas (a API devolve `referrals` dentro de `data` + `meta`). */
const list = useList((page: number) =>
  affiliatesApi.page({ page, per_page: 25 }).then((res) => {
    header.value = res.data
    return { data: res.data.referrals ?? [], meta: res.meta }
  }),
)

/* ---------------- Dados para recebimento (PUT /affiliates/payout) --------
 * Espelha `AffiliatePayoutService::validate` (mesmos campos/validações e
 * mensagens do painel). Pré-preenche com os valores MASCARADOS do GET;
 * campo ainda mascarado (com `*`) nunca é enviado — pede o valor completo. */

const payout = computed(() => header.value?.payout ?? null)

const payoutForm = reactive({
  holder: '',
  document: '',
  pix_key_type: 'cpf' as PixKeyType,
  pix_key: '',
  bank: '',
  branch: '',
  account: '',
  account_digit: '',
})
const payoutErrors = ref<Record<string, string>>({})
const payoutError = ref('')
const payoutSaving = ref(false)
const payoutSaved = ref('')
let payoutDirty: boolean = false

function perr(key: string): string | null {
  return payoutErrors.value[key] ?? null
}

const onlyDigits = (value: string): string => value.replace(/\D/g, '')

function formatCpf(digits: string): string {
  return digits
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatCnpj(digits: string): string {
  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatDocument(digits: string): string {
  const d = digits.slice(0, 14)
  return d.length > 11 ? formatCnpj(d) : formatCpf(d)
}

const pixKeyLabel = computed(() => {
  switch (payoutForm.pix_key_type) {
    case 'cpf':
      return 'Chave Pix (CPF)'
    case 'cnpj':
      return 'Chave Pix (CNPJ)'
    case 'email':
      return 'Chave Pix (e-mail)'
    case 'phone':
      return 'Chave Pix (celular com DDD)'
    default:
      return 'Chave Pix (aleatória)'
  }
})

const pixKeyHint = computed(() => {
  switch (payoutForm.pix_key_type) {
    case 'cpf':
      return 'CPF com 11 dígitos (só números).'
    case 'cnpj':
      return 'CNPJ com 14 dígitos (só números).'
    case 'email':
      return 'E-mail válido.'
    case 'phone':
      return 'DDD + número, de 10 a 13 dígitos.'
    default:
      return 'UUID da chave aleatória.'
  }
})

const pixKeyInputMode = computed(() =>
  payoutForm.pix_key_type === 'email' || payoutForm.pix_key_type === 'random'
    ? 'text'
    : 'numeric',
)

function onDocumentInput(event: CustomEvent) {
  payoutDirty = true
  const raw = String((event as CustomEvent<{ value?: string | number }>).detail?.value ?? '')
  if (raw.includes('*')) {
    // Valor mascarado em edição: deixa digitar por cima sem formatar.
    payoutForm.document = raw
    return
  }
  payoutForm.document = formatDocument(onlyDigits(raw))
}

function onPixKeyInput(event: CustomEvent) {
  payoutDirty = true
  const raw = String((event as CustomEvent<{ value?: string | number }>).detail?.value ?? '')
  const type = payoutForm.pix_key_type
  if (raw.includes('*') || type === 'email' || type === 'random') {
    payoutForm.pix_key = type === 'email' || type === 'random' ? raw.trimStart() : raw
    return
  }
  const digits = onlyDigits(raw)
  if (type === 'cpf') payoutForm.pix_key = formatCpf(digits)
  else if (type === 'cnpj') payoutForm.pix_key = formatCnpj(digits)
  else payoutForm.pix_key = digits.slice(0, 13)
}

function onPixTypeChange() {
  payoutDirty = true
  payoutErrors.value = {}
  // Mascarado pertence ao tipo antigo — limpa para não validar errado.
  if (payoutForm.pix_key.includes('*')) payoutForm.pix_key = ''
}

/** Marca o form como editado (handler dos campos simples — evita atribuição
 * inline no template, que o vue-tsc estreita para o literal `false`). */
function markPayoutDirty() {
  payoutDirty = true
}

/** Pré-preenche com o GET (mascarados como vêm); pula quando o usuário já
 * está editando, para o pull-to-refresh não apagar a digitação. */
function hydratePayout(force = false) {
  if (payoutDirty && !force) return
  const p = header.value?.payout
  payoutForm.holder = p?.holder ?? ''
  payoutForm.document = p?.document ?? ''
  const pixType = p?.pix_key_type
  if (
    pixType === 'cpf' ||
    pixType === 'cnpj' ||
    pixType === 'email' ||
    pixType === 'phone' ||
    pixType === 'random'
  ) {
    payoutForm.pix_key_type = pixType
  }
  payoutForm.pix_key = p?.pix_key ?? ''
  payoutForm.bank = p?.bank ?? ''
  payoutForm.branch = p?.branch ?? ''
  payoutForm.account = p?.account ?? ''
  payoutForm.account_digit = p?.account_digit ?? ''
  payoutDirty = false
}

/** Validação cliente espelhando os 422 do `AffiliatePayoutService`. */
function validatePayout(): boolean {
  const errs: Record<string, string> = {}
  if (!payoutForm.holder.trim()) errs.holder = 'Informe o nome do titular.'
  if (payoutForm.document.includes('*')) {
    errs.document = 'Por segurança, digite o CPF/CNPJ completo para atualizar.'
  } else if (![11, 14].includes(onlyDigits(payoutForm.document).length)) {
    errs.document = 'Informe um CPF ou CNPJ válido do titular.'
  }
  const type = payoutForm.pix_key_type
  if (payoutForm.pix_key.includes('*')) {
    errs.pix_key = 'Por segurança, digite a chave Pix completa para atualizar.'
  } else {
    const key =
      type === 'cpf' || type === 'cnpj' || type === 'phone'
        ? onlyDigits(payoutForm.pix_key)
        : payoutForm.pix_key.trim()
    const ok =
      type === 'cpf'
        ? /^\d{11}$/.test(key)
        : type === 'cnpj'
          ? /^\d{14}$/.test(key)
          : type === 'email'
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
            : type === 'phone'
              ? /^\d{10,13}$/.test(key)
              : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    if (!ok) errs.pix_key = 'A chave PIX não corresponde ao tipo selecionado.'
  }
  if (!payoutForm.bank.trim()) errs.bank = 'Informe o banco.'
  if (payoutForm.branch.includes('*')) {
    errs.branch = 'Por segurança, digite a agência completa para atualizar.'
  } else if (!payoutForm.branch.trim()) {
    errs.branch = 'Informe a agência.'
  }
  if (payoutForm.account.includes('*')) {
    errs.account = 'Por segurança, digite a conta completa para atualizar.'
  } else if (!payoutForm.account.trim()) {
    errs.account = 'Informe a conta.'
  }
  if (payoutForm.account_digit.includes('*')) {
    errs.account_digit = 'Por segurança, digite o dígito para atualizar (ou apague).'
  }
  payoutErrors.value = errs
  return Object.keys(errs).length === 0
}

/** `affiliate_payout_*` do 422 → nomes locais do form. */
function mapPayoutErrors(server: Record<string, string[]>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, messages] of Object.entries(server)) {
    const local = key.startsWith('affiliate_payout_') ? key.slice('affiliate_payout_'.length) : key
    if (messages?.[0]) out[local] = messages[0]
  }
  return out
}

async function savePayout() {
  payoutSaved.value = ''
  payoutError.value = ''
  payoutErrors.value = {}
  if (!validatePayout()) {
    payoutError.value = 'Confira os campos destacados.'
    return
  }
  payoutSaving.value = true
  try {
    const type = payoutForm.pix_key_type
    const { data } = await affiliatesApi.updatePayout({
      affiliate_payout_holder: payoutForm.holder.trim(),
      affiliate_payout_document: onlyDigits(payoutForm.document),
      affiliate_payout_pix_key_type: type,
      affiliate_payout_pix_key:
        type === 'cpf' || type === 'cnpj' || type === 'phone'
          ? onlyDigits(payoutForm.pix_key)
          : payoutForm.pix_key.trim(),
      affiliate_payout_bank: payoutForm.bank.trim(),
      affiliate_payout_branch: payoutForm.branch.trim(),
      affiliate_payout_account: payoutForm.account.trim(),
      affiliate_payout_account_digit: payoutForm.account_digit.trim() === '' ? null : payoutForm.account_digit.trim(),
    })
    // Confirmação SEM ecoar dado sensível — só a mensagem do servidor.
    payoutSaved.value = data.message || 'Dados para recebimento atualizados.'
    payoutDirty = false
    await list.refresh()
    hydratePayout(true)
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    payoutErrors.value = mapPayoutErrors(fieldErrors(e))
    payoutError.value = apiMessage(e)
  } finally {
    payoutSaving.value = false
  }
}

const statCards = computed(() => {
  const s = header.value?.stats
  return [
    {
      label: 'Indicados',
      value: s ? String(s.referrals) : '—',
      icon: 'people-outline',
      chip: 'chip-blue',
      small: false,
    },
    {
      label: 'Em teste',
      value: s ? String(s.testing) : '—',
      icon: 'time-outline',
      chip: 'chip-amber',
      small: false,
    },
    {
      label: 'Aptas p/ repasse',
      value: s ? String(s.eligible) : '—',
      icon: 'checkmark-circle-outline',
      chip: 'chip-green',
      small: false,
    },
    {
      label: 'A receber',
      value: s ? money(s.pending_amount) : '—',
      icon: 'wallet-outline',
      chip: 'chip-amber',
      small: true,
    },
    {
      label: 'Já recebido',
      value: s ? money(s.paid_amount) : '—',
      icon: 'cash-outline',
      chip: 'chip-green',
      small: true,
    },
    {
      label: 'Total ganho',
      value: s ? money(s.total_earned) : '—',
      icon: 'trending-up-outline',
      chip: 'chip-violet',
      small: true,
    },
  ]
})

/** Cores dos 4 status de `Referral::statusLabel()` (contrato § grupo 11). */
function referralColor(status: ReferralStatus): string {
  if (status === 'paid') return 'success'
  if (status === 'eligible') return 'primary'
  if (status === 'testing') return 'warning'
  return 'medium'
}

function money(value: number | null): string {
  if (value === null || value === undefined) return '—'
  try {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  } catch {
    return String(value)
  }
}

function dateShort(value: string | null): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('pt-BR')
  } catch {
    return value
  }
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function copyText(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(okMessage)
  } catch {
    toast('Não foi possível copiar.')
  }
}

async function copyLink() {
  if (header.value?.link) await copyText(header.value.link, 'Link copiado')
}

async function copyCode() {
  if (header.value?.code) await copyText(header.value.code, 'Código copiado')
}

/** Share nativo (`navigator.share` abre o sheet do sistema no device) com
 * fallback para clipboard. `@capacitor/share` não instalado de propósito:
 * a Web Share API já cobre o caso sem nova dependência nativa. */
async function share() {
  const link = header.value?.link ?? ''
  if (!link) return
  try {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (typeof nav.share === 'function') {
      await nav.share({
        title: 'YZap — indicação',
        text: `Crie sua conta no YZap pelo meu link: ${link}`,
        url: link,
      })
      return
    }
  } catch {
    /* usuário cancelou o sheet — cai no clipboard como confirmação */
  }
  await copyText(link, 'Link copiado')
}

async function load() {
  busy.value = true
  loadError.value = ''
  try {
    await list.refresh()
    hydratePayout()
  } catch (e: unknown) {
    // Grupo 11 é só `auth` (sem `active`): conta inativa acompanha aqui —
    // NUNCA redireciona para /renovar. 401/403 roteiam pelo padrão.
    if (await routeApiError(e, router)) return
    loadError.value = apiMessage(e)
  } finally {
    busy.value = false
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

async function onRefresh(event: CustomEvent) {
  await load()
  const target = event.target as unknown as { complete?: () => void }
  target.complete?.()
}

onMounted(load)
</script>

<style scoped>
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
.code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.88rem;
  color: var(--ion-text-color);
}
.aff-stats {
  grid-template-columns: repeat(3, 1fr);
  margin-top: 16px;
}
.rules {
  margin: 8px 0 0;
  padding-left: 1.2rem;
  color: var(--ion-text-color);
  font-size: 0.88rem;
  line-height: 1.55;
}
.rules li + li {
  margin-top: 8px;
}
.rules strong {
  font-weight: 800;
}
/* Dados para recebimento: texto e confirmação usam vars do tema
 * (light/dark auditado — sem cor fixa). */
.payout-note {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  font-size: 0.85rem;
  margin: 0 0 12px;
}
.payout-note ion-icon {
  flex: none;
  margin-top: 2px;
}
.payout-ok {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border: 1px solid var(--ion-color-success);
  border-radius: 10px;
  padding: 10px 12px;
  margin: 0 0 12px;
  color: var(--ion-text-color);
  font-size: 0.88rem;
}
.payout-ok ion-icon {
  flex: none;
  font-size: 1.3rem;
  color: var(--ion-color-success);
}
.payout-ok p {
  margin: 2px 0;
}
@media (max-width: 991px) {
  .aff-stats {
    grid-template-columns: 1fr;
  }
}
</style>
