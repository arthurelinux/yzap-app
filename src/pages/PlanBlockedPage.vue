<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Recurso do plano</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <!-- 403 de PLANO (contrato inclui `plan` + `feature`): tela distinta da de permissão. -->
      <ion-icon name="diamond-outline" class="big"></ion-icon>
      <h1>Este recurso é do plano {{ plan || 'pago' }}</h1>
      <p v-if="feature" class="muted">Recurso: {{ feature }}</p>
      <p class="muted">Fale com o titular da loja para fazer upgrade e liberar este recurso.</p>
      <ion-button @click="goBack">Voltar ao início</ion-button>
      <ion-button fill="outline" router-link="/assinatura">Ver planos e assinar</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue'

const route = useRoute()
const router = useRouter()
const plan = computed(() => route.query.plan as string | undefined)
const feature = computed(() => route.query.feature as string | undefined)

function goBack() {
  void router.replace({ name: 'inicio' })
}
</script>

<style scoped>
.big {
  font-size: 3rem;
  color: var(--yz-accent-ink);
  margin-top: 32px;
}
.muted {
  color: var(--yz-muted);
}
</style>
