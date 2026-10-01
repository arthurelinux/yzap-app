<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Renovar acesso</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <!-- Conta inativa: GET /me e /account/status devolvem 200 com account.active=false + renewal_url. -->
      <ion-icon name="card-outline" class="big"></ion-icon>
      <h1>Sua conta está inativa</h1>
      <p class="muted">{{ session.account?.message ?? 'Renove para continuar usando o app.' }}</p>
      <p v-if="session.account?.plan" class="muted">Plano atual: {{ session.account.plan }}</p>
      <ion-button v-if="renewalUrl" @click="openRenewal">Renovar agora</ion-button>
      <ion-button fill="outline" @click="recheck" :disabled="session.busy">
        {{ session.busy ? 'Verificando…' : 'Já renovei — verificar' }}
      </ion-button>
      <div>
        <ion-button fill="clear" color="danger" @click="onLogout">Sair</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonIcon } from '@ionic/vue'
import { Browser } from '@capacitor/browser'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()

const renewalUrl = computed(() => session.account?.renewal_url)

async function openRenewal() {
  // Renovação/checkout acontecem no BROWSER EXTERNO. O retorno apenas navega;
  // o status real vem da API (webhook é a fonte de verdade).
  if (renewalUrl.value) await Browser.open({ url: renewalUrl.value })
}

async function recheck() {
  await session.refreshMe()
  if (session.isActive) await router.replace({ name: 'inicio' })
}

async function onLogout() {
  await session.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.big {
  font-size: 3rem;
  color: var(--yz-primary);
  margin-top: 32px;
}
.muted {
  color: var(--yz-muted);
}
</style>
