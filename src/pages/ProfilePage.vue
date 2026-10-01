<template>
  <ion-page>
    <AppBar back back-href="/inicio" />
    <ion-content class="ion-padding">
      <PageHead title="Meu perfil" sub="Conta" />

      <ion-card>
        <ion-card-content>
          <div class="row-between">
            <div>
              <h2 class="card-title">{{ session.user?.name }}</h2>
              <p class="muted">{{ session.user?.email }}</p>
            </div>
            <div class="avatar-a big">{{ initial }}</div>
          </div>
          <p class="hint" style="margin-top: 10px">
            Plano: {{ session.account?.plan ?? '—' }}
            <template v-if="session.account?.access_expires_at">
              · acesso até
              {{ accessLabel }}
            </template>
          </p>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-content>
          <h2 class="card-title">Alterar senha</h2>
          <form @submit.prevent="onChangePassword">
            <ion-item lines="full" class="yz-field">
              <ion-input
                v-model="currentPassword"
                type="password"
                label="Senha atual"
                label-placement="floating"
                autocomplete="current-password"
                required
              />
            </ion-item>
            <ion-item lines="full" class="yz-field">
              <ion-input
                v-model="newPassword"
                type="password"
                label="Nova senha (mín. 8)"
                label-placement="floating"
                autocomplete="new-password"
                :minlength="8"
                required
              />
            </ion-item>
            <ion-item lines="full" class="yz-field">
              <ion-input
                v-model="confirmPassword"
                type="password"
                label="Confirmar nova senha"
                label-placement="floating"
                autocomplete="new-password"
                :minlength="8"
                required
              />
            </ion-item>

            <p v-if="error" class="err-text">{{ error }}</p>
            <ion-button expand="block" type="submit" :disabled="busy">
              {{ busy ? 'Salvando…' : 'Salvar nova senha' }}
            </ion-button>
            <p class="hint">
              Ao alterar, as outras sessões do app são desconectadas (tokens revogados).
            </p>
          </form>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-content>
          <h2 class="card-title">Sessões</h2>
          <div class="yz-actions">
            <ion-button fill="outline" color="danger" :disabled="busyAll" @click="onLogoutAll">
              <ion-icon slot="start" name="log-out-outline"></ion-icon>
              Sair de todos os aparelhos
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2000"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonToast,
} from '@ionic/vue'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import { useSessionStore } from '@/stores/session'
import { authApi } from '@/api/auth'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'

const session = useSessionStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const busyAll = ref(false)
const error = ref<string | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

const initial = computed(
  () => (session.user?.name ?? 'L').trim().charAt(0).toUpperCase() || 'L',
)

const accessLabel = computed(() => {
  const iso = session.account?.access_expires_at
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
})

async function onChangePassword() {
  error.value = null
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'A confirmação não confere.'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'A nova senha precisa de ao menos 8 caracteres.'
    return
  }
  busy.value = true
  try {
    await authApi.changePassword(currentPassword.value, newPassword.value, confirmPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toastMessage.value = 'Senha alterada'
    toastOpen.value = true
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    const fields = fieldErrors(e)
    error.value = fields.current_password?.[0] ?? fields.password?.[0] ?? apiMessage(e)
  } finally {
    busy.value = false
  }
}

async function onLogoutAll() {
  busyAll.value = true
  try {
    await session.logout(true)
    await router.replace({ name: 'login' })
  } finally {
    busyAll.value = false
  }
}
</script>

<style scoped>
.avatar-a.big {
  width: 46px;
  height: 46px;
  font-size: 1.1rem;
}
</style>
