<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Sem permissão</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <!-- 403 de PERMISSÃO (sem plan/feature): tela distinta da de plano, sem CTA de upgrade. -->
      <ion-icon name="lock-closed-outline" class="big"></ion-icon>
      <h1>Você não tem permissão</h1>
      <p class="muted">Peça ao titular da loja para liberar seu acesso a este recurso.</p>
      <ion-button @click="goBack">Voltar ao início</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue'

const router = useRouter()
function goBack() {
  void router.replace({ name: 'inicio' })
}
</script>

<style scoped>
.big {
  font-size: 3rem;
  color: var(--yz-muted);
  margin-top: 32px;
}
.muted {
  color: var(--yz-muted);
}
</style>
