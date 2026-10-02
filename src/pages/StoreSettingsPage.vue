<template>
  <ion-page>
    <AppBar back back-href="/inicio" />
    <ion-content class="ion-padding">
      <PageHead title="Configurar loja" sub="Minha loja" />

      <div v-if="loading" class="yz-state">
        <ion-spinner></ion-spinner>
        <p>Carregando configurações…</p>
      </div>

      <template v-else-if="shop.store">
        <!-- Abas: Identidade | Atendimento (GET/PUT /maps) | Equipe (só titular). -->
        <ion-segment :value="tab" @ionChange="onTabChange" class="yz-segment">
          <ion-segment-button value="identidade">
            <ion-label>Identidade</ion-label>
          </ion-segment-button>
          <ion-segment-button value="atendimento">
            <ion-label>Atendimento</ion-label>
          </ion-segment-button>
          <ion-segment-button v-if="isOwner" value="equipe">
            <ion-label>Equipe</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div v-if="tab === 'identidade'">
        <!-- ============ Dados da loja (PUT /store/settings — escalares) ============ -->
        <ion-card>
          <ion-card-content>
            <h2 class="card-title">Dados da loja</h2>
            <form @submit.prevent="saveData">
              <div class="yz-form-grid">
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.name" label="Nome da loja" label-placement="floating" />
                  <p v-if="err('name')" class="err-text">{{ err('name') }}</p>
                </ion-item>

                <div class="yz-field">
                  <ion-item lines="full">
                    <ion-input
                      v-model="form.slug"
                      label="Endereço da loja (slug)"
                      label-placement="floating"
                    />
                  </ion-item>
                  <p v-if="err('slug')" class="err-text">{{ err('slug') }}</p>
                  <div class="yz-actions">
                    <ion-button size="small" fill="outline" :disabled="sugBusy" @click="loadSuggestions">
                      <ion-icon slot="start" name="link-outline"></ion-icon>Sugerir endereços
                    </ion-button>
                    <span v-if="sugAvailable === false" class="err-text" style="margin: 0">
                      Endereço em uso.
                    </span>
                  </div>
                  <div v-if="suggestions.length" class="yz-chips" style="margin-top: 6px">
                    <ion-chip
                      v-for="s in suggestions"
                      :key="s"
                      @click="form.slug = s"
                    >{{ s }}</ion-chip>
                  </div>
                </div>

                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="form.whatsapp"
                    label="WhatsApp (só números)"
                    label-placement="floating"
                    inputmode="numeric"
                  />
                  <p v-if="err('whatsapp')" class="err-text">{{ err('whatsapp') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="form.accent_color"
                    label="Cor de destaque (#rrggbb)"
                    label-placement="floating"
                  />
                  <input
                    slot="end"
                    type="color"
                    class="color-pick"
                    :value="form.accent_color || '#087f6f'"
                    @input="onColorInput"
                  />
                  <p v-if="err('accent_color')" class="err-text">{{ err('accent_color') }}</p>
                </ion-item>

                <ion-item lines="full" class="yz-field full">
                  <ion-textarea
                    v-model="form.description"
                    label="Descrição"
                    label-placement="floating"
                    :rows="3"
                    auto-grow
                  />
                  <p v-if="err('description')" class="err-text">{{ err('description') }}</p>
                </ion-item>

                <div class="full">
                  <ion-item lines="none" class="yz-field">
                    <ion-label>
                      <h3>Publicar minha loja</h3>
                      <p class="hint">Loja online fica visível no seu endereço público.</p>
                    </ion-label>
                    <ion-toggle slot="end" :checked="form.is_published" @ionChange="form.is_published = detailChecked($event)" />
                  </ion-item>
                  <p v-if="err('is_published')" class="err-text">{{ err('is_published') }}</p>
                </div>

                <div class="full sector-row">
                  <span class="hint">Segmento:</span>
                  <ion-chip>{{ shop.store.sector_label ?? shop.store.sector ?? '—' }}</ion-chip>
                  <span class="hint">troca de segmento continua no painel web.</span>
                </div>
              </div>

              <h3 class="section-sub">Endereço</h3>
              <div class="yz-form-grid">
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.postal_code" label="CEP" label-placement="floating" inputmode="numeric" />
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
                  <ion-input v-model="form.address_complement" label="Complemento" label-placement="floating" />
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
                  <ion-input v-model="form.state_code" label="UF" label-placement="floating" :maxlength="2" />
                  <p v-if="err('state_code')" class="err-text">{{ err('state_code') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input
                    v-model="form.delivery_fee"
                    label="Taxa de entrega (R$)"
                    label-placement="floating"
                    inputmode="decimal"
                  />
                  <p v-if="err('delivery_fee')" class="err-text">{{ err('delivery_fee') }}</p>
                </ion-item>
              </div>

              <h3 class="section-sub">Redes sociais</h3>
              <div class="yz-form-grid">
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.instagram_url" label="Instagram" label-placement="floating" inputmode="url" />
                  <p v-if="err('instagram_url')" class="err-text">{{ err('instagram_url') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.facebook_url" label="Facebook" label-placement="floating" inputmode="url" />
                  <p v-if="err('facebook_url')" class="err-text">{{ err('facebook_url') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.tiktok_url" label="TikTok" label-placement="floating" inputmode="url" />
                  <p v-if="err('tiktok_url')" class="err-text">{{ err('tiktok_url') }}</p>
                </ion-item>
                <ion-item lines="full" class="yz-field">
                  <ion-input v-model="form.youtube_url" label="YouTube" label-placement="floating" inputmode="url" />
                  <p v-if="err('youtube_url')" class="err-text">{{ err('youtube_url') }}</p>
                </ion-item>
              </div>

              <p v-if="saveError" class="err-text">{{ saveError }}</p>
              <ion-button expand="block" type="submit" :disabled="saving">
                {{ saving ? 'Salvando…' : 'Salvar alterações' }}
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <!-- ============ Imagens (PUT /store/settings multipart) ============ -->
        <ion-card>
          <ion-card-content>
            <h2 class="card-title">Logo e capa</h2>
            <div class="img-grid">
              <div>
                <p class="stat-label">Logo</p>
                <div class="img-preview">
                  <img v-if="logoPreview" :src="logoPreview" alt="Logo" />
                  <img v-else-if="shop.store.logo_url" :src="shop.store.logo_url" alt="Logo" />
                  <span v-else class="hint">sem logo</span>
                </div>
                <input ref="logoInput" type="file" accept="image/*" class="hidden-input" @change="pickFile('logo', $event)" />
                <ion-button size="small" fill="outline" @click="logoInput?.click()">
                  <ion-icon slot="start" name="image-outline"></ion-icon>
                  {{ logoFile ? 'Trocar' : 'Escolher' }}
                </ion-button>
                <p v-if="logoFile" class="hint">{{ logoFile.name }}</p>
              </div>
              <div>
                <p class="stat-label">Capa</p>
                <div class="img-preview cover">
                  <img v-if="coverPreview" :src="coverPreview" alt="Capa" />
                  <img v-else-if="shop.store.cover_image_url" :src="shop.store.cover_image_url" alt="Capa" />
                  <span v-else class="hint">sem capa</span>
                </div>
                <input ref="coverInput" type="file" accept="image/*" class="hidden-input" @change="pickFile('cover', $event)" />
                <ion-button size="small" fill="outline" @click="coverInput?.click()">
                  <ion-icon slot="start" name="image-outline"></ion-icon>
                  {{ coverFile ? 'Trocar' : 'Escolher' }}
                </ion-button>
                <p v-if="coverFile" class="hint">{{ coverFile.name }}</p>
              </div>
            </div>
            <p v-if="imageError" class="err-text">{{ imageError }}</p>
            <ion-button
              expand="block"
              :disabled="savingImages || (!logoFile && !coverFile)"
              @click="saveImages"
            >
              {{ savingImages ? 'Enviando…' : 'Enviar imagens' }}
            </ion-button>
            <p class="hint">Logo até 3 MB · capa até 5 MB.</p>
          </ion-card-content>
        </ion-card>

        <!-- ============ Horários (PUT /store/opening-hours) ============ -->
        <ion-card>
          <ion-card-content>
            <div class="row-between">
              <h2 class="card-title">Horários de funcionamento</h2>
              <ion-toggle
                :checked="hours.show"
                @ionChange="hours.show = detailChecked($event)"
              ></ion-toggle>
            </div>
            <p class="hint" style="margin-top: -6px">Exibir horários na loja online.</p>

            <div v-for="day in dayKeys" :key="day" class="day-row">
              <ion-item lines="none" class="day-main">
                <ion-label>{{ dayLabels[day] }}</ion-label>
                <ion-toggle
                  slot="end"
                  :checked="hours.days[day]?.enabled"
                  @ionChange="hours.days[day].enabled = detailChecked($event)"
                ></ion-toggle>
              </ion-item>
              <template v-if="hours.days[day]?.enabled">
                <div v-if="hours.days[day]?.all_day" class="hint day-time">24 horas</div>
                <div v-else class="day-time">
                  <ion-input
                    type="time"
                    :value="hours.days[day]?.opens_at ?? ''"
                    @ionChange="hours.days[day].opens_at = detailValue($event)"
                  ></ion-input>
                  <span class="hint">até</span>
                  <ion-input
                    type="time"
                    :value="hours.days[day]?.closes_at ?? ''"
                    @ionChange="hours.days[day].closes_at = detailValue($event)"
                  ></ion-input>
                  <ion-checkbox
                    :checked="hours.days[day]?.all_day"
                    @ionChange="hours.days[day].all_day = detailChecked($event)"
                  ></ion-checkbox>
                  <span class="hint">24h</span>
                </div>
              </template>
            </div>

            <p v-if="hoursError" class="err-text">{{ hoursError }}</p>
            <ion-button expand="block" :disabled="savingHours" @click="saveHours">
              {{ savingHours ? 'Salvando…' : 'Salvar horários' }}
            </ion-button>
          </ion-card-content>
        </ion-card>
        </div>
        <div v-else-if="tab === 'atendimento'">
          <MapsPanel ref="mapsPanel" />
        </div>
        <div v-else-if="tab === 'equipe'">
          <TeamPanel v-if="isOwner" :show-title="false" />
        </div>
      </template>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2200"
        position="top"
        @didDismiss="toastOpen = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonChip,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonToggle,
  IonToast,
  IonSpinner,
} from '@ionic/vue'
import AppBar from '@/components/AppBar.vue'
import PageHead from '@/components/PageHead.vue'
import MapsPanel from '@/components/MapsPanel.vue'
import TeamPanel from '@/components/TeamPanel.vue'
import { useShopStore } from '@/stores/shop'
import { storeApi, type ImageFiles, type OpeningDay, type SettingsScalars } from '@/api/store'
import { apiMessage, fieldErrors, routeApiError } from '@/composables/errors'

type FileEvent = Event & { target: HTMLInputElement }

/** Helpers tipados p/ eventos Ionic (detail checked/value). */
function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }>)?.detail
  return Boolean(detail?.checked)
}
function detailValue(event: unknown): string {
  const detail = (event as CustomEvent<{ value?: string | number }>)?.detail
  return String(detail?.value ?? '')
}

const shop = useShopStore()
const router = useRouter()
const route = useRoute()

/** Abas da tela (deep-link via `?tab=`). Equipe só para o titular. */
type SettingsTab = 'identidade' | 'atendimento' | 'equipe'
const tab = ref<SettingsTab>('identidade')
const isOwner = computed(() => shop.store?.is_owner === true)
const mapsPanel = ref<InstanceType<typeof MapsPanel> | null>(null)
/** PUT /store/settings descarta as coordenadas ao mudar o endereço — o próximo
 * GET /maps recalcula. Marca aqui, recarrega ao ativar a aba. */
let mapsDirty = false

function segmentValue(event: unknown): string {
  const detail = (event as CustomEvent<{ value?: string }> | undefined)?.detail
  return String(detail?.value ?? '')
}

function onTabChange(event: unknown) {
  const value = segmentValue(event)
  if (value !== 'identidade' && value !== 'atendimento' && value !== 'equipe') return
  if (value === 'equipe' && !isOwner.value) return
  tab.value = value
  void router.replace({ query: { ...route.query, tab: value } })
}

watch(tab, async (value) => {
  if (value !== 'atendimento') return
  await nextTick()
  await mapsPanel.value?.refresh(mapsDirty)
  mapsDirty = false
})

const loading = ref(true)
const saving = ref(false)
const savingImages = ref(false)
const savingHours = ref(false)
const saveError = ref<string | null>(null)
const imageError = ref<string | null>(null)
const hoursError = ref<string | null>(null)
const errors = ref<Record<string, string[]>>({})

const toastOpen = ref(false)
const toastMessage = ref('')

const dayKeys = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
const dayLabels: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const form = reactive<SettingsScalars>({})
const hours = reactive<{ show: boolean; days: Record<string, OpeningDay> }>({
  show: false,
  days: {},
})

const suggestions = ref<string[]>([])
const sugBusy = ref(false)
const sugAvailable = ref<boolean | null>(null)

const logoFile = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const coverPreview = ref<string | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

function hydrate() {
  const s = shop.store
  if (!s) return
  form.name = s.name
  form.slug = s.slug
  form.whatsapp = s.whatsapp ?? ''
  form.accent_color = s.accent_color ?? '#087f6f'
  form.description = s.description ?? ''
  form.is_published = s.is_published
  form.postal_code = s.address.postal_code ?? ''
  form.address = s.address.street ?? ''
  form.address_number = s.address.number ?? ''
  form.address_complement = s.address.complement ?? ''
  form.neighborhood = s.address.neighborhood ?? ''
  form.city_name = s.address.city ?? ''
  form.state_code = s.address.state ?? ''
  form.delivery_fee =
    s.fulfillment?.delivery_fee !== null && s.fulfillment?.delivery_fee !== undefined
      ? String(s.fulfillment.delivery_fee)
      : ''
  form.instagram_url = s.social.instagram_url ?? ''
  form.facebook_url = s.social.facebook_url ?? ''
  form.tiktok_url = s.social.tiktok_url ?? ''
  form.youtube_url = s.social.youtube_url ?? ''

  hours.show = s.show_opening_hours
  hours.days = {}
  for (const day of dayKeys) {
    const saved = s.opening_hours?.[day]
    hours.days[day] = saved
      ? { ...saved, opens_at: saved.opens_at ?? '09:00', closes_at: saved.closes_at ?? '18:00' }
      : { enabled: false, all_day: false, opens_at: '09:00', closes_at: '18:00' }
  }
}

function err(key: string): string | null {
  return errors.value[key]?.[0] ?? null
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

function nullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/** Payload parcial: só o que o formulário pode alterar. */
function buildPayload(): SettingsScalars {
  return {
    name: form.name ?? '',
    slug: form.slug ?? '',
    whatsapp: nullable(form.whatsapp),
    accent_color: nullable(form.accent_color),
    description: nullable(form.description),
    is_published: Boolean(form.is_published),
    postal_code: nullable(form.postal_code),
    address: nullable(form.address),
    address_number: nullable(form.address_number),
    address_complement: nullable(form.address_complement),
    neighborhood: nullable(form.neighborhood),
    city_name: nullable(form.city_name),
    state_code: nullable(form.state_code)?.toUpperCase() ?? null,
    delivery_fee: nullable(form.delivery_fee),
    instagram_url: nullable(form.instagram_url),
    facebook_url: nullable(form.facebook_url),
    tiktok_url: nullable(form.tiktok_url),
    youtube_url: nullable(form.youtube_url),
  }
}

async function saveData() {
  saving.value = true
  saveError.value = null
  errors.value = {}
  try {
    const updated = await storeApi.updateSettings(buildPayload())
    shop.applyStore(updated)
    hydrate()
    mapsDirty = true
    toast('Alterações salvas')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    errors.value = fieldErrors(e)
    saveError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

async function loadSuggestions() {
  sugBusy.value = true
  try {
    const { data } = await storeApi.linkSuggestions({
      slug: (form.slug ?? '').trim() || (form.name ?? '').trim(),
    })
    suggestions.value = data.suggestions
    sugAvailable.value = data.available
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  } finally {
    sugBusy.value = false
  }
}

function pickFile(which: 'logo' | 'cover', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (which === 'logo') {
    logoFile.value = file
    if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
    logoPreview.value = file ? URL.createObjectURL(file) : null
  } else {
    coverFile.value = file
    if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
    coverPreview.value = file ? URL.createObjectURL(file) : null
  }
  input.value = ''
}

async function saveImages() {
  const files: ImageFiles = {}
  if (logoFile.value) files.logo = logoFile.value
  if (coverFile.value) files.cover_image = coverFile.value
  if (!files.logo && !files.cover_image) return

  savingImages.value = true
  imageError.value = null
  const before = shop.store
  try {
    const updated = await storeApi.updateImages(files)
    // Verificação de integridade: em PHP < 8.4 o multipart em PUT não é
    // parseado e o servidor descarta o arquivo em silêncio.
    const logoFailed = Boolean(files.logo) && updated.logo_url === before?.logo_url
    const coverFailed = Boolean(files.cover_image) && updated.cover_image_url === before?.cover_image_url
    shop.applyStore(updated)
    if (logoFailed || coverFailed) {
      imageError.value =
        'A API não recebeu a imagem (upload por PUT multipart indisponível nesta versão). Use o painel web ou atualize a API.'
      logoFile.value = null
      coverFile.value = null
      logoPreview.value = null
      coverPreview.value = null
    } else {
      logoFile.value = null
      coverFile.value = null
      logoPreview.value = null
      coverPreview.value = null
      toast('Imagens atualizadas')
    }
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    imageError.value = apiMessage(e)
  } finally {
    savingImages.value = false
  }
}

async function saveHours() {
  hoursError.value = null
  const opening: Record<string, OpeningDay> = {}
  for (const day of dayKeys) {
    const d = hours.days[day]
    const enabled = Boolean(d?.enabled)
    const allDay = enabled && Boolean(d?.all_day)
    if (enabled && !allDay && (!d?.opens_at || !d?.closes_at)) {
      hoursError.value = `Informe abertura e fechamento de ${dayLabels[day]}.`
      return
    }
    if (enabled && !allDay && d?.opens_at === d?.closes_at) {
      hoursError.value = `Abertura e fechamento iguais em ${dayLabels[day]}: marque 24 horas.`
      return
    }
    opening[day] = {
      enabled,
      all_day: allDay,
      opens_at: enabled && !allDay ? (d?.opens_at ?? '') : null,
      closes_at: enabled && !allDay ? (d?.closes_at ?? '') : null,
    }
  }

  savingHours.value = true
  try {
    const { data } = await storeApi.updateOpeningHours({
      show_opening_hours: hours.show,
      opening_hours: opening,
    })
    shop.applyStore(data)
    hydrate()
    toast('Horários salvos')
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    hoursError.value = apiMessage(e)
  } finally {
    savingHours.value = false
  }
}

function onColorInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  form.accent_color = value
}

onMounted(async () => {
  if (!shop.store) {
    try {
      await shop.load()
    } catch (e: unknown) {
      if (await routeApiError(e, router)) return
    }
  }
  hydrate()
  const requested = route.query.tab
  if (requested === 'identidade' || requested === 'atendimento') {
    tab.value = requested
  } else if (requested === 'equipe' && shop.store?.is_owner) {
    tab.value = 'equipe'
  }
  if (tab.value === 'atendimento') {
    await nextTick()
    await mapsPanel.value?.refresh(mapsDirty)
    mapsDirty = false
  }
  loading.value = false
})
</script>

<style scoped>
.yz-segment {
  margin-bottom: 14px;
  --background: var(--yz-card);
}
.section-sub {
  margin: 18px 0 6px;
  font-size: 0.95rem;
  font-weight: 700;
}
.color-pick {
  width: 36px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--yz-mist);
  border-radius: 8px;
  background: transparent;
}
.sector-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 12px;
}
.img-preview {
  height: 84px;
  border: 1px dashed var(--yz-mist);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 8px;
  background: #fff;
}
.img-preview img {
  max-width: 100%;
  max-height: 80px;
  object-fit: contain;
}
.hidden-input {
  display: none;
}
.day-row {
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);
  padding-bottom: 4px;
  margin-bottom: 6px;
}
.day-main {
  --padding-start: 0;
  --padding-end: 0;
}
.day-time {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 8px;
}
.day-time ion-input {
  border: 1px solid var(--yz-mist);
  border-radius: 8px;
  --padding-start: 8px;
  max-width: 130px;
}
</style>
