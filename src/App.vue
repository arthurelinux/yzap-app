<template>
  <!-- Shell fiel ao gabarito `preview/ionic.blade.php` (reescrito como componentes
       Vue/Ionic reais): ion-split-pane com menu lateral (232px desktop, drawer no mobile),
       dropdowns de perfil via ion-popover e tab-bar mobile. -->
  <ion-app>
    <ion-split-pane content-id="main-content" when="lg">
      <ion-menu content-id="main-content" v-if="session.isAuthenticated">
        <div class="yz-logo"><img src="@/assets/horizontal.png" alt="YZap" /></div>
        <ion-content>
          <div class="menu-sec">MINHA LOJA</div>
          <ion-item button router-link="/inicio" router-direction="root" class="menu-item" lines="none">
            <ion-icon slot="start" name="home-outline"></ion-icon>
            <ion-label>Visão geral</ion-label>
          </ion-item>
          <ion-item
            v-for="item in soonItems"
            :key="item.label"
            button
            router-link="/em-breve"
            class="menu-item"
            lines="none"
          >
            <ion-icon slot="start" :name="item.icon"></ion-icon>
            <ion-label>{{ item.label }}</ion-label>
            <ion-badge slot="end" color="medium">em breve</ion-badge>
          </ion-item>
          <div class="menu-sec">CONTA</div>
          <ion-item button lines="none" class="menu-item" @click="onLogout">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            <ion-label>Sair</ion-label>
          </ion-item>
        </ion-content>
      </ion-menu>

      <div class="ion-page" id="main-content">
        <ion-router-outlet></ion-router-outlet>
        <ion-tab-bar slot="bottom" class="mobile-tabs" v-if="session.isAuthenticated">
          <ion-tab-button tab="inicio" href="/inicio">
            <ion-icon name="home-outline"></ion-icon>
            <ion-label>Início</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="pedidos" href="/em-breve">
            <ion-icon name="receipt-outline"></ion-icon>
            <ion-label>Pedidos</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="produtos" href="/em-breve">
            <ion-icon name="cube-outline"></ion-icon>
            <ion-label>Produtos</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="mais" href="/em-breve">
            <ion-icon name="menu-outline"></ion-icon>
            <ion-label>Mais</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </div>
    </ion-split-pane>
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonBadge,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenu,
  IonRouterOutlet,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()

/** Mesmos 17 itens do painel (gabarito); só "Visão geral" é funcional nesta fase. */
const soonItems = [
  { label: 'Configurar loja', icon: 'storefront-outline' },
  { label: 'Categorias', icon: 'grid-outline' },
  { label: 'Produtos', icon: 'cube-outline' },
  { label: 'Pedidos', icon: 'receipt-outline' },
  { label: 'Clientes', icon: 'people-outline' },
  { label: 'Financeiro', icon: 'wallet-outline' },
  { label: 'Caixa', icon: 'lock-closed-outline' },
  { label: 'Estoque', icon: 'cube-outline' },
  { label: 'Notificações', icon: 'notifications-outline' },
  { label: 'Abrir minha loja', icon: 'open-outline' },
  { label: 'Assinatura', icon: 'card-outline' },
  { label: 'Programa de afiliados', icon: 'share-social-outline' },
  { label: 'Usuários', icon: 'person-add-outline' },
  { label: 'Mercado Pago', icon: 'cash-outline' },
  { label: 'Como criar sua loja', icon: 'help-circle-outline' },
  { label: 'WhatsApp e API', icon: 'logo-whatsapp' },
]

async function onLogout() {
  await session.logout()
  await router.replace({ name: 'login' })
}
</script>

<style>
@import '@/theme/tokens.css';

ion-split-pane {
  --side-width: 232px;
  --side-min-width: 232px;
  --side-max-width: 232px;
}
.yz-logo {
  padding: 14px 18px 6px;
}
.yz-logo img {
  height: 30px;
  width: auto;
  display: block;
}
.menu-sec {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #9aa3b2;
  padding: 14px 22px 4px;
}
.menu-item {
  --border-radius: 10px;
  margin: 1px 10px;
  font-weight: 600;
}
ion-tab-bar.mobile-tabs {
  display: none;
}
@media (max-width: 991px) {
  ion-tab-bar.mobile-tabs {
    display: flex;
  }
}
html.ion-palette-dark .yz-logo img {
  filter: brightness(0) invert(1);
}
</style>
