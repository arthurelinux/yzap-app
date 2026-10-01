<template>
  <ion-page>
    <ion-content class="ion-padding login-bg">
      <div class="login-wrap">
        <img src="@/assets/horizontal.png" alt="YZap" class="login-logo" />
        <h1>Entrar na minha loja</h1>
        <p class="sub">Gerencie pedidos, produtos e finanças pelo celular.</p>

        <form @submit.prevent="onPasswordLogin">
          <ion-item lines="full" class="field">
            <ion-input
              v-model="email"
              type="email"
              label="E-mail"
              label-placement="floating"
              autocomplete="email"
              required
            />
          </ion-item>
          <ion-item lines="full" class="field">
            <ion-input
              v-model="password"
              type="password"
              label="Senha"
              label-placement="floating"
              autocomplete="current-password"
              required
            />
          </ion-item>

          <ion-button expand="block" type="submit" :disabled="session.busy">
            {{ session.busy ? 'Entrando…' : 'Entrar' }}
          </ion-button>
        </form>

        <div class="divider"><span>ou</span></div>

        <ion-button expand="block" fill="outline" :disabled="session.busy || !googleReady" @click="onGoogleLogin">
          <ion-icon slot="start" name="logo-google"></ion-icon>
          Entrar com Google
        </ion-button>
        <p v-if="!googleReady" class="hint">
          Login Google indisponível: configure o Client ID (VITE_GOOGLE_CLIENT_ID).
        </p>

        <ion-text v-if="error" color="danger">
          <p class="error">{{ error }}</p>
        </ion-text>
        <ion-text v-if="accountBlocked" color="warning">
          <p class="error">Sua conta está inativa. Após entrar, você verá a tela de renovação.</p>
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonPage, IonText } from '@ionic/vue'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { Capacitor } from '@capacitor/core'
import { ApiError } from '@/api/client'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const accountBlocked = ref(false)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const googleReady = computed(() => Boolean(googleClientId))

onMounted(() => {
  // O app NUNCA valida token Google localmente: só obtém o id_token e envia a POST /auth/google.
  if (googleClientId) {
    GoogleAuth.initialize({
      clientId: googleClientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    })
  }
})

async function afterLogin() {
  // Login mobile permite conta inativa: o app consulta /me e monta renovação.
  if (!session.isActive) {
    await router.replace({ name: 'renovar' })
    return
  }
  await router.replace({ name: 'inicio' })
}

async function onPasswordLogin() {
  error.value = null
  accountBlocked.value = false
  try {
    await session.login(email.value.trim(), password.value)
    if (!session.isActive) accountBlocked.value = true
    await afterLogin()
  } catch (e: unknown) {
    error.value = e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente de novo.'
  }
}

async function onGoogleLogin() {
  error.value = null
  try {
    const result = await GoogleAuth.signIn()
    const idToken = result?.authentication?.idToken
    if (!idToken) throw new Error('Google não devolveu id_token.')
    await session.loginWithGoogle(idToken)
    await afterLogin()
  } catch (e: unknown) {
    // Em web sem plugin/GIS configurado, orienta em vez de falhar em silêncio.
    if (!Capacitor.isNativePlatform()) {
      error.value =
        e instanceof Error ? e.message : 'Login Google indisponível neste ambiente.'
    } else {
      error.value = e instanceof Error ? e.message : 'Falha no login Google.'
    }
  } finally {
    try {
      await GoogleAuth.signOut()
    } catch {
      /* sessão Google local não é a sessão do app */
    }
  }
}
</script>

<style scoped>
.login-bg {
  --background: var(--yz-bg);
}
.login-wrap {
  max-width: 420px;
  margin: 8vh auto 0;
}
.login-logo {
  height: 34px;
  width: auto;
  display: block;
  margin-bottom: 18px;
}
h1 {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 4px;
  color: var(--ion-text-color);
}
.sub {
  color: var(--yz-muted);
  margin: 0 0 20px;
}
.field {
  --background: transparent;
  margin-bottom: 10px;
  border-radius: var(--yz-radius-sm);
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--yz-muted);
  margin: 18px 0;
}
.divider::before,
.divider::after {
  content: '';
  height: 1px;
  flex: 1;
  background: var(--yz-mist);
}
.hint {
  font-size: 0.8rem;
  color: var(--yz-muted);
  text-align: center;
}
.error {
  text-align: center;
  margin-top: 14px;
}
</style>
