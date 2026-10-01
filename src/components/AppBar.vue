<template>
  <!-- AppBar fiel ao gabarito `preview/ionic.blade.php`: menu/back à esquerda,
       ações globais (tema + conta) à direita. Páginas acrescentam botões extras
       no slot `extra` (antes do perfil, na ordem do spike). -->
  <ion-header class="ion-no-border">
    <ion-toolbar class="topbar">
      <ion-buttons slot="start">
        <ion-back-button v-if="back" :default-href="backHref" class="ion-no-text"></ion-back-button>
        <ion-menu-button v-else></ion-menu-button>
      </ion-buttons>

      <ion-buttons slot="end">
        <slot name="extra"></slot>
        <ion-button id="theme-toggle" title="Alternar tema" @click="onToggleTheme">
          <ion-icon :name="isDark ? 'sunny-outline' : 'moon-outline'"></ion-icon>
        </ion-button>
        <ion-button id="profile-btn" class="ion-margin-end" title="Conta">
          <div class="avatar-a">{{ initial }}</div>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>

    <!-- Popover de conta (mesmos itens do spike): perfil, assinatura, tema, sair. -->
    <ion-popover trigger="profile-btn" class="top-pop">
      <ion-list lines="none">
        <ion-item>
          <div class="avatar-a" slot="start">{{ initial }}</div>
          <ion-label>
            <h3>{{ session.user?.name ?? '—' }}</h3>
            <p>{{ session.user?.email ?? '' }}</p>
          </ion-label>
        </ion-item>
        <ion-item button @click="go('/perfil')">
          <ion-icon slot="start" name="person-outline"></ion-icon>
          <ion-label>Meu perfil</ion-label>
        </ion-item>
        <ion-item button @click="go('/assinatura')">
          <ion-icon slot="start" name="card-outline"></ion-icon>
          <ion-label>Assinatura</ion-label>
        </ion-item>
        <ion-item button @click="onToggleTheme">
          <ion-icon slot="start" name="contrast-outline"></ion-icon>
          <ion-label>Alternar tema</ion-label>
        </ion-item>
        <ion-item button lines="none" @click="onLogout">
          <ion-icon slot="start" name="log-out-outline" color="danger"></ion-icon>
          <ion-label color="danger">Sair</ion-label>
        </ion-item>
      </ion-list>
    </ion-popover>
  </ion-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPopover,
  IonToolbar,
  popoverController,
} from '@ionic/vue'
import { useSessionStore } from '@/stores/session'
import { toggleTheme, useTheme } from '@/composables/theme'

const props = withDefaults(
  defineProps<{
    /** Mostra botão voltar em vez do hambúrguer (páginas internas). */
    back?: boolean
    backHref?: string
  }>(),
  { back: false, backHref: '/inicio' },
)

const session = useSessionStore()
const router = useRouter()
const { mode } = useTheme()

const isDark = computed(() => mode.value === 'dark')
const initial = computed(
  () => (session.user?.name ?? 'L').trim().charAt(0).toUpperCase() || 'L',
)

function onToggleTheme() {
  void popoverController.dismiss()
  toggleTheme()
}

async function go(path: string) {
  await popoverController.dismiss()
  await router.push(path)
}

async function onLogout() {
  await popoverController.dismiss()
  await session.logout()
  await router.replace({ name: 'login' })
}
</script>
