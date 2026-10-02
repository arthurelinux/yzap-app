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
import { computed, onMounted, ref } from 'vue'
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
  IonSpinner,
  IonText,
  IonToast,
} from '@ionic/vue'
import { affiliatesApi, type AffiliatePage, type Referral, type ReferralStatus } from '@/api/affiliates'
import { apiMessage, routeApiError } from '@/composables/errors'
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
@media (max-width: 991px) {
  .aff-stats {
    grid-template-columns: 1fr;
  }
}
</style>
