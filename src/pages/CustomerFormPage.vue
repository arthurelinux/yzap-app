<template>
  <ion-page>
    <AppBar back back-href="/clientes" />
    <ion-content class="ion-padding">
      <PageHead :title="isEdit ? 'Editar cliente' : 'Novo cliente'" sub="Clientes" />

      <ion-card>
        <ion-card-content>
          <form @submit.prevent="save">
            <div class="yz-form-grid">
              <ion-item lines="full" class="yz-field full">
                <ion-input v-model="form.name" label="Nome" label-placement="floating" required />
                <p v-if="err('name')" class="err-text">{{ err('name') }}</p>
              </ion-item>

              <ion-item lines="full" class="yz-field full">
                <ion-input
                  v-model="form.phone"
                  label="WhatsApp (só números)"
                  label-placement="floating"
                  inputmode="numeric"
                  required
                />
                <p v-if="err('phone')" class="err-text">{{ err('phone') }}</p>
              </ion-item>

              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.postal_code"
                  label="CEP"
                  label-placement="floating"
                  inputmode="numeric"
                />
                <p v-if="err('postal_code')" class="err-text">{{ err('postal_code') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.address" label="Rua" label-placement="floating" />
                <p v-if="err('address')" class="err-text">{{ err('address') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.address_number" label="Número" label-placement="floating" />
                <p v-if="err('address_number')" class="err-text">{{ err('address_number') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.address_complement"
                  label="Complemento"
                  label-placement="floating"
                />
                <p v-if="err('address_complement')" class="err-text">{{ err('address_complement') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.neighborhood" label="Bairro" label-placement="floating" />
                <p v-if="err('neighborhood')" class="err-text">{{ err('neighborhood') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="form.city_name" label="Cidade" label-placement="floating" />
                <p v-if="err('city_name')" class="err-text">{{ err('city_name') }}</p>
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="form.state_code"
                  label="UF"
                  label-placement="floating"
                  :maxlength="2"
                />
                <p v-if="err('state_code')" class="err-text">{{ err('state_code') }}</p>
              </ion-item>
            </div>

            <p v-if="saveError" class="err-text">{{ saveError }}</p>
            <ion-button expand="block" type="submit" :disabled="saving">
              {{ saving ? 'Salvando…' : 'Salvar cliente' }}
            </ion-button>
          </form>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonButton, IonCard, IonCardContent, IonContent, IonInput, IonItem, IonPage } from '@ionic/vue'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import { customersApi, type CustomerPayload } from '@/api/customers'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => Boolean(route.params.id))
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const saveError = ref<string | null>(null)

const form = reactive<{
  name: string
  phone: string
  postal_code: string | null
  address: string | null
  address_number: string | null
  address_complement: string | null
  neighborhood: string | null
  city_name: string | null
  state_code: string | null
}>({
  name: '',
  phone: '',
  postal_code: null,
  address: null,
  address_number: null,
  address_complement: null,
  neighborhood: null,
  city_name: null,
  state_code: null,
})

function err(key: string): string | null {
  return errors.value[key]?.[0] ?? null
}

function nullable(value: string | null): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

async function hydrate() {
  // Lookup pré-preenchido (?phone= vindo da busca) ou edição.
  const queryPhone = typeof route.query.phone === 'string' ? route.query.phone : ''
  if (queryPhone) form.phone = queryPhone
  if (!isEdit.value) return
  try {
    const { data } = await customersApi.get(String(route.params.id))
    form.name = data.name
    form.phone = data.phone
    form.postal_code = data.postal_code
    form.address = data.street
    form.address_number = data.number
    form.address_complement = data.complement
    form.neighborhood = data.neighborhood
    form.city_name = data.city
    form.state_code = data.state
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    saveError.value = apiMessage(e)
  }
}

async function save() {
  saving.value = true
  saveError.value = null
  errors.value = {}
  const payload: CustomerPayload = {
    name: form.name.trim(),
    phone: form.phone.replace(/\D/g, ''),
    postal_code: nullable(form.postal_code),
    address: nullable(form.address),
    address_number: nullable(form.address_number),
    address_complement: nullable(form.address_complement),
    neighborhood: nullable(form.neighborhood),
    city_name: nullable(form.city_name),
    state_code: nullable(form.state_code)?.toUpperCase() ?? null,
  }
  try {
    if (isEdit.value) {
      const { data } = await customersApi.update(String(route.params.id), payload)
      await router.replace(`/clientes/${data.id}`)
    } else {
      const { data } = await customersApi.create(payload)
      await router.replace(`/clientes/${data.id}`)
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    errors.value = fieldErrors(e)
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(hydrate)
</script>
