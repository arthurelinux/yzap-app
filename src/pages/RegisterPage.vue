<template>
  <ion-page>
    <ion-content class="ion-padding login-bg">
      <div class="login-wrap">
        <img src="@/assets/horizontal.png" alt="YZap" class="login-logo" />
        <h1>Criar conta</h1>
        <p class="sub">Abra sua loja e ganhe dias de teste grátis.</p>

        <form @submit.prevent="onRegister">
          <ion-item lines="full" class="field" :class="{ 'field-error': errors.name }">
            <ion-input
              v-model="name"
              type="text"
              label="Nome"
              label-placement="floating"
              autocomplete="name"
              required
            />
          </ion-item>
          <ion-note v-if="errors.name" color="danger">{{ errors.name }}</ion-note>

          <ion-item lines="full" class="field" :class="{ 'field-error': errors.email }">
            <ion-input
              v-model="email"
              type="email"
              label="E-mail"
              label-placement="floating"
              autocomplete="email"
              required
            />
          </ion-item>
          <ion-note v-if="errors.email" color="danger">{{ errors.email }}</ion-note>

          <ion-item lines="full" class="field" :class="{ 'field-error': errors.password }">
            <ion-input
              v-model="password"
              type="password"
              label="Senha (mín. 8 caracteres)"
              label-placement="floating"
              autocomplete="new-password"
              required
            />
          </ion-item>
          <ion-note v-if="errors.password" color="danger">{{ errors.password }}</ion-note>

          <ion-item
            lines="full"
            class="field"
            :class="{ 'field-error': errors.password_confirmation }"
          >
            <ion-input
              v-model="passwordConfirmation"
              type="password"
              label="Confirmar senha"
              label-placement="floating"
              autocomplete="new-password"
              required
            />
          </ion-item>
          <ion-note v-if="errors.password_confirmation" color="danger">
            {{ errors.password_confirmation }}
          </ion-note>

          <ion-item lines="full" class="field" :class="{ 'field-error': errors.referral_code }">
            <ion-input
              v-model="referralCode"
              type="text"
              label="Código de indicação (opcional)"
              label-placement="floating"
              autocomplete="off"
            />
          </ion-item>
          <ion-note v-if="errors.referral_code" color="danger">
            {{ errors.referral_code }}
          </ion-note>
          <p v-else class="hint">
            Tem um código de convite? Cole aqui (links yzap.com.br/indicar/código).
          </p>

          <ion-button expand="block" type="submit" :disabled="session.busy">
            {{ session.busy ? 'Criando…' : 'Criar conta' }}
          </ion-button>
        </form>

        <ion-text v-if="generalError" color="danger">
          <p class="error">{{ generalError }}</p>
        </ion-text>

        <p class="swap">
          <router-link :to="{ name: 'login' }">Já tenho conta</router-link>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonNote,
  IonPage,
  IonText,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { fieldErrors } from '@/composables/errors'
import { useSessionStore } from '@/stores/session'

/**
 * Cadastro (contrato § Grupo 1: `POST /auth/register`).
 * 201 = envelope de sessão: entra direto (mesmo fluxo do login — token
 * seguro, dashboard). 422 por campo. Conta criada já vem com trial.
 */
const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const referralCode = ref('')
const generalError = ref<string | null>(null)
const errors = reactive<Record<string, string | null>>({
  name: null,
  email: null,
  password: null,
  password_confirmation: null,
  referral_code: null,
})

onMounted(() => {
  // Pré-preenche o código de convite quando presente na URL (?code= / ?referral_code=).
  // PENDÊNCIA: o app ainda não escuta `appUrlOpen` (deeplink/universal link), então
  // abrir `yzap.com.br/indicar/{code}` no celular NÃO cai aqui sozinho — o campo
  // manual cobre o fluxo até a infra de deeplink existir. Não improvisar listener.
  const q = route.query
  const raw = q.code ?? q.referral_code ?? q.referral
  const code = Array.isArray(raw) ? raw[0] : raw
  if (typeof code === 'string' && code.trim()) referralCode.value = code.trim()
})

function clearErrors() {
  generalError.value = null
  for (const k of Object.keys(errors)) errors[k] = null
}

/** Validação cliente espelha os 422 do servidor (mesmas mensagens). */
function validateLocal(): boolean {
  if (!name.value.trim()) errors.name = 'Informe seu nome.'
  if (!email.value.trim()) errors.email = 'Informe seu e-mail.'
  if (password.value.length < 8) errors.password = 'A senha precisa de no mínimo 8 caracteres.'
  if (passwordConfirmation.value !== password.value)
    errors.password_confirmation = 'As senhas não conferem.'
  return !errors.name && !errors.email && !errors.password && !errors.password_confirmation
}

/** Dias de teste restantes a partir do `access_expires_at` do trial. */
function trialDays(): number | null {
  const iso = session.account?.access_expires_at
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  return Math.max(1, Math.ceil(diff / 86_400_000))
}

async function onRegister() {
  clearErrors()
  if (!validateLocal()) return
  try {
    await session.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      password_confirmation: passwordConfirmation.value,
      referral_code: referralCode.value.trim() || undefined,
    })
    // Conta inativa cai na renovação (mesmo fluxo do login); ativa vai ao
    // dashboard com boas-vindas do trial (?boasvindas=N dias).
    if (!session.isActive) {
      await router.replace({ name: 'renovar' })
      return
    }
    const days = trialDays()
    await router.replace({
      name: 'inicio',
      query: days ? { boasvindas: String(days) } : {},
    })
  } catch (e: unknown) {
    const fields = fieldErrors(e)
    let mapped = false
    for (const [k, msgs] of Object.entries(fields)) {
      const key = k === 'referralCode' ? 'referral_code' : k
      if (key in errors && msgs.length) {
        errors[key] = msgs[0]
        mapped = true
      }
    }
    // `confirmed` do Laravel costuma cair em `password`; duplica na confirmação.
    if (errors.password && !errors.password_confirmation) {
      errors.password_confirmation = errors.password
    }
    if (!mapped) {
      generalError.value =
        e instanceof ApiError ? e.message : 'Não foi possível criar a conta. Tente de novo.'
    }
  }
}
</script>

<style scoped>
/* Mesma identidade do Login (cores por tema — contraste auditado light/dark). */
.login-bg {
  --background: var(--yz-bg);
}
.login-wrap {
  max-width: 420px;
  margin: 8vh auto 0;
  color: var(--ion-text-color);
}
.login-wrap ion-item {
  --background: transparent;
  --color: var(--ion-text-color);
}
.login-logo {
  height: 34px;
  width: auto;
  display: block;
  margin: 0 auto 18px;
}
h1 {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 4px;
  color: var(--ion-text-color);
  text-align: center;
}
.sub {
  color: var(--yz-muted);
  margin: 0 0 20px;
  text-align: center;
}
.field {
  --background: transparent;
  margin-bottom: 10px;
  border-radius: var(--yz-radius-sm);
}
.field-error {
  --border-color: var(--ion-color-danger);
}
ion-note {
  display: block;
  margin: -4px 0 10px 16px;
  font-size: 0.8rem;
}
.hint {
  font-size: 0.8rem;
  color: var(--yz-muted);
  margin: -4px 0 14px 16px;
}
ion-button[type='submit'] {
  margin-top: 6px;
}
.error {
  text-align: center;
  margin-top: 14px;
}
.swap {
  text-align: center;
  margin-top: 18px;
}
.swap a {
  color: var(--yz-accent-ink);
  font-weight: 700;
  text-decoration: none;
}
</style>
