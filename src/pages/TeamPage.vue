<template>
  <ion-page>
    <AppBar back back-href="/inicio" />
    <ion-content class="ion-padding">
      <TeamPanel />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import AppBar from '@/components/AppBar.vue'
import TeamPanel from '@/components/TeamPanel.vue'
</script>
