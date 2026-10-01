<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/inicio"></ion-back-button>
        </ion-buttons>
        <ion-title>Em breve</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <ion-icon name="hammer-outline" class="big"></ion-icon>
      <h1>Chegando na próxima fase</h1>
      <p class="muted">
        Esta seção ( Pedidos · Produtos · Estoque · Clientes · Financeiro · Planos · Admin )
        ainda não tem tela — o escopo desta fase é só Login + Dashboard.
      </p>
      <ion-button router-link="/inicio">Voltar ao início</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
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
