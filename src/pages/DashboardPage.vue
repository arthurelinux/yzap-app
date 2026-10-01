<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="topbar">
        <ion-menu-button slot="start"></ion-menu-button>
        <ion-title>Minha loja <span class="page-sub">Visão geral</span></ion-title>
        <ion-buttons slot="end">
          <ion-button id="theme-toggle" title="Alternar tema">
            <ion-icon :name="dark ? 'sunny-outline' : 'moon-outline'"></ion-icon>
          </ion-button>
          <ion-button id="notif-btn" title="Notificações">
            <ion-icon name="notifications-outline"></ion-icon>
          </ion-button>
          <ion-button id="profile-btn" title="Conta">
            <div class="avatar-a">{{ initial }}</div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-card v-if="shop.stale" color="warning" class="stale-card">
        <ion-card-content>
          <ion-icon name="cloud-offline-outline"></ion-icon>
          Sem conexão — dados em cache
          <span v-if="shop.cachedAt"> ({{ cachedLabel }})</span>. Podem estar desatualizados.
        </ion-card-content>
      </ion-card>

      <div v-if="shop.busy && !shop.store" class="loading">
        <ion-spinner></ion-spinner>
        <p>Carregando sua loja…</p>
      </div>

      <ion-text v-else-if="shop.lastError && !shop.store" color="danger">
        <p>{{ shop.lastError }}</p>
        <ion-button fill="outline" @click="reload">Tentar de novo</ion-button>
      </ion-text>

      <template v-else-if="shop.store">
        <div class="stat-grid">
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Publicação</p>
                <p class="stat-num">{{ shop.store.is_published ? 'Online' : 'Offline' }}</p>
              </div>
              <div class="icon-chip chip-green">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
              </div>
            </ion-card-content>
          </ion-card>
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Plano</p>
                <p class="stat-num">{{ session.account?.plan ?? '—' }}</p>
              </div>
              <div class="icon-chip chip-blue"><ion-icon name="card-outline"></ion-icon></div>
            </ion-card-content>
          </ion-card>
          <ion-card class="stat-card">
            <ion-card-content>
              <div>
                <p class="stat-label">Acesso até</p>
                <p class="stat-num small">{{ accessLabel }}</p>
              </div>
              <div class="icon-chip chip-green"><ion-icon name="calendar-outline"></ion-icon></div>
            </ion-card-content>
          </ion-card>
        </div>

        <div class="main-grid">
          <ion-card class="panel-card">
            <ion-card-content>
              <h2>{{ shop.store.name }}</h2>
              <p class="muted">{{ addressLine }}</p>
              <div class="url-row">
                <ion-input readonly :value="shop.store.public_url ?? ''"></ion-input>
                <ion-button class="btn-copy" fill="outline" @click="copyLink">Copiar</ion-button>
                <ion-button class="btn-open" @click="openStore">Abrir</ion-button>
              </div>
              <div class="actions-row">
                <ion-button fill="outline" color="success" router-link="/em-breve">
                  <ion-icon slot="start" name="cube-outline"></ion-icon>Cadastrar produto
                </ion-button>
                <ion-button fill="outline" color="secondary" router-link="/em-breve">
                  <ion-icon slot="start" name="receipt-outline"></ion-icon>Gerenciar pedidos
                </ion-button>
              </div>
              <p class="muted soon">Equipe e configurações completas entram no próximo passo (grupo 2).</p>
            </ion-card-content>
          </ion-card>

          <ion-card class="panel-card">
            <ion-card-content class="ion-text-center">
              <h2>QR Code da loja</h2>
              <div class="qr-box">
                <img :src="qrSrc" alt="QR Code da loja" loading="lazy" />
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </template>

      <ion-popover trigger="notif-btn" class="top-pop">
        <ion-list lines="full">
          <ion-list-header>
            <ion-label>Notificações</ion-label>
          </ion-list-header>
          <ion-item lines="none">
            <ion-label><p>As notificações do app chegam no próximo passo (polling de pedidos).</p></ion-label>
          </ion-item>
        </ion-list>
      </ion-popover>

      <ion-popover trigger="profile-btn" class="top-pop">
        <ion-list lines="none">
          <ion-item>
            <div class="avatar-a" slot="start">{{ initial }}</div>
            <ion-label>
              <h3>{{ session.user?.name }}</h3>
              <p>{{ session.user?.email }}</p>
            </ion-label>
          </ion-item>
          <ion-item button @click="goRenew">
            <ion-icon slot="start" name="card-outline"></ion-icon>
            <ion-label>Assinatura</ion-label>
          </ion-item>
          <ion-item button @click="toggleTheme">
            <ion-icon slot="start" name="contrast-outline"></ion-icon>
            <ion-label>Alternar tema</ion-label>
          </ion-item>
          <ion-item button lines="none" @click="onLogout">
            <ion-icon slot="start" name="log-out-outline" color="danger"></ion-icon>
            <ion-label color="danger">Sair</ion-label>
          </ion-item>
        </ion-list>
      </ion-popover>

      <ion-toast
        :is-open="toastOpen"
        message="Link copiado"
        :duration="1500"
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
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonPage,
  IonPopover,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import { useSessionStore } from '@/stores/session'
import { useShopStore } from '@/stores/shop'
import { ApiError } from '@/api/client'

const session = useSessionStore()
const shop = useShopStore()
const router = useRouter()
const toastOpen = ref(false)
const dark = ref(false)

const initial = computed(() => (session.user?.name ?? 'L').trim().charAt(0).toUpperCase() || 'L')

const accessLabel = computed(() => {
  const iso = session.account?.access_expires_at
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
})

const cachedLabel = computed(() => {
  if (!shop.cachedAt) return ''
  try {
    return new Date(shop.cachedAt).toLocaleString('pt-BR')
  } catch {
    return ''
  }
})

const addressLine = computed(() => {
  const a = shop.store?.address
  if (!a) return ''
  return [a.street, a.number, a.neighborhood, a.city, a.state].filter(Boolean).join(' · ')
})

/** QR gerado a partir da public_url REAL da loja (sem dado mock). */
const qrSrc = computed(() => {
  const url = shop.store?.public_url ?? ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
})

function applyTheme(value: boolean) {
  dark.value = value
  document.documentElement.classList.toggle('ion-palette-dark', value)
}

function toggleTheme() {
  applyTheme(!dark.value)
}

async function reload() {
  try {
    await shop.load()
    applyAccent()
    if (shop.planBlock) {
      await router.replace({
        name: 'plano-bloqueado',
        query: {
          plan: shop.planBlock.plan ?? '',
          feature: shop.planBlock.feature ?? '',
        },
      })
    } else if (shop.permissionDenied) {
      await router.replace({ name: 'sem-permissao' })
    }
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace({ name: 'login' })
    }
    // 403 já roteado acima via flags; erro de rede com cache cai em `stale`.
  }
}

/** Respeita o accent_color da loja (contrato § identidade). */
function applyAccent() {
  document.documentElement.style.setProperty('--yz-accent', shop.accentColor)
  document.documentElement.style.setProperty('--ion-color-primary', shop.accentColor)
}

async function onRefresh(event: CustomEvent) {
  await reload()
  const target = event.target as unknown as { complete?: () => void }
  target.complete?.()
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shop.store?.public_url ?? '')
  } catch {
    /* clipboard indisponível */
  }
  toastOpen.value = true
}

async function openStore() {
  const url = shop.store?.public_url
  if (url) await Browser.open({ url })
}

async function goRenew() {
  await router.push({ name: 'renovar' })
}

async function onLogout() {
  await session.logout()
  await router.replace({ name: 'login' })
}

onMounted(async () => {
  applyTheme(
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )
  try {
    await session.refreshMe()
    if (!session.isActive) {
      await router.replace({ name: 'renovar' })
      return
    }
  } catch {
    /* segue para carregar do cache; 401 volta ao login via reload */
  }
  await reload()
})
</script>

<style scoped>
.topbar {
  --background: #fff;
}
.page-sub {
  color: var(--yz-muted);
  font-size: 0.85rem;
  font-weight: 400;
  border-left: 1px solid var(--yz-mist);
  padding-left: 12px;
  margin-left: 12px;
}
.avatar-a {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--yz-mint);
  color: var(--yz-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  margin: 0;
  border-radius: 16px;
}
.stat-card ion-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px;
}
.stat-label {
  color: var(--yz-muted);
  font-size: 0.85rem;
  margin: 0 0 4px;
}
.stat-num {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}
.stat-num.small {
  font-size: 1.1rem;
}
.icon-chip {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex: none;
}
.chip-blue {
  background: #e3edff;
  color: #2563eb;
}
.chip-green {
  background: #e2f7e5;
  color: #16a34a;
}
.main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}
.panel-card {
  margin: 0;
  border-radius: 16px;
}
h2 {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 700;
}
.muted {
  color: var(--yz-muted);
}
.soon {
  font-size: 0.8rem;
  margin-top: 12px;
}
.url-row {
  display: flex;
  gap: 0;
  align-items: stretch;
}
.url-row ion-input {
  flex: 1 1 auto;
  border: 1px solid var(--yz-mist);
  border-right: none;
  border-radius: 10px 0 0 10px;
  --padding-start: 12px;
}
.btn-copy {
  --border-radius: 0;
  margin: 0;
}
.btn-open {
  --border-radius: 0 10px 10px 0;
  margin: 0;
}
.actions-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px solid var(--yz-mist);
  padding-top: 16px;
  margin-top: 16px;
}
.qr-box {
  border: 1px solid var(--yz-mist);
  border-radius: 12px;
  padding: 10px;
  display: inline-block;
}
.qr-box img {
  width: 200px;
  height: 200px;
  display: block;
}
.loading {
  text-align: center;
  padding: 48px 0;
  color: var(--yz-muted);
}
.stale-card {
  border-radius: 12px;
}
@media (max-width: 991px) {
  .stat-grid,
  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
