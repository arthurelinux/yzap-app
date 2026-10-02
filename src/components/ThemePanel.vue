<!-- ThemePanel — aba Temas do painel (GET/PUT /appearance/theme + /appearance/custom).
  -
  - Espelha `resources/views/catalog/admin/themes.blade.php` (repo Laravel irmão):
  - catálogo de temas (name/description/badge, `food` filtrado fora do segmento
  - no servidor; aplicar `food` fora do segmento devolve 422) + arquivos do tema
  - personalizado (HTML .html/.htm e CSS .css, 256 KB; scripts/eventos/`@import`
  - viram 422; sanitização final no `CustomThemeService`).
  -
  - Gating: grupo SEM plano pago (só permissão `store_theme`). 403 aqui é
  - sempre permissão → emite `denied` para a página ocultar a aba (item negado
  - some; sem CTA de upgrade neste grupo).
-->
<template>
  <div v-if="loading" class="yz-state">
    <ion-spinner></ion-spinner>
    <p>Carregando temas…</p>
  </div>

  <template v-else-if="theme">
    <ion-card>
      <ion-card-content>
        <h2 class="card-title">Temas padrão</h2>
        <p class="hint" style="margin-top: -4px">
          A vitrine muda na hora em
          <a v-if="publicUrl" :href="publicUrl" target="_blank" rel="noopener">sua loja pública</a
          ><span v-else>sua loja pública</span>.
        </p>

        <div class="theme-grid">
          <div
            v-for="(meta, key) in theme.themes"
            :key="key"
            class="theme-card"
            :class="{ active: theme.theme === key }"
          >
            <div class="theme-preview" :class="`theme-${key}`" aria-hidden="true">
              <div class="tp-bar"><b></b><span></span><i></i></div>
              <div class="tp-hero"><span></span><span></span><em></em></div>
              <div class="tp-products"><i></i><i></i><i></i></div>
            </div>
            <div class="theme-body">
              <div class="row-between">
                <h3>{{ meta.name }}</h3>
                <ion-badge color="medium">{{ meta.badge }}</ion-badge>
              </div>
              <p class="hint">{{ meta.description }}</p>
              <ion-button
                expand="block"
                size="small"
                :color="theme.theme === key ? 'success' : 'primary'"
                :disabled="applying || theme.theme === key"
                @click="applyTheme(String(key))"
              >
                <ion-icon v-if="theme.theme === key" slot="start" name="checkmark-outline"></ion-icon>
                {{ theme.theme === key ? 'Tema ativo' : applying ? 'Aplicando…' : 'Aplicar tema' }}
              </ion-button>
            </div>
          </div>
        </div>
        <p v-if="themeError" class="err-text" role="alert">{{ themeError }}</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-content>
        <h2 class="card-title">Tema personalizado</h2>
        <p class="hint" style="margin-top: -4px">
          Envie os arquivos que personalizam a vitrine sem alterar produtos, carrinho ou
          pedidos. Limites de segurança: sem JavaScript, sem
          <code>&lt;script&gt;</code>, sem eventos como <code>onclick</code> e sem
          <code>@import</code> no CSS.
        </p>

        <p v-if="custom" class="hint">
          Arquivos atuais:
          {{ custom.has_html ? `HTML (${formatSize(custom.html_size)})` : 'sem HTML' }} ·
          {{ custom.has_css ? `CSS (${formatSize(custom.css_size)})` : 'sem CSS' }}
        </p>

        <div class="file-row">
          <label class="file-label" for="custom-html">Estrutura HTML</label>
          <input
            id="custom-html"
            type="file"
            accept=".html,.htm,text/html"
            :disabled="uploading"
            @change="onPick('html', $event)"
          />
          <p class="hint">Opcional. Arquivo .html ou .htm, até 256 KB.</p>
          <p v-if="pickedHtml" class="picked">{{ pickedHtml.name }} ({{ formatSize(pickedHtml.size) }})</p>
        </div>

        <div class="file-row">
          <label class="file-label" for="custom-css">Folha de estilos CSS</label>
          <input
            id="custom-css"
            type="file"
            accept=".css,text/css"
            :disabled="uploading"
            @change="onPick('css', $event)"
          />
          <p class="hint">Opcional. Arquivo .css, até 256 KB.</p>
          <p v-if="pickedCss" class="picked">{{ pickedCss.name }} ({{ formatSize(pickedCss.size) }})</p>
        </div>

        <p v-if="customError" class="err-text" role="alert">{{ customError }}</p>
        <div class="yz-actions">
          <ion-button :disabled="uploading || (!pickedHtml && !pickedCss)" @click="uploadCustom">
            <ion-spinner v-if="uploading" name="crescent"></ion-spinner>
            {{ uploading ? 'Enviando…' : 'Enviar arquivos' }}
          </ion-button>
          <ion-button
            v-if="theme.has_custom"
            fill="outline"
            :disabled="applying"
            @click="applyTheme('custom')"
          >
            {{ theme.theme === 'custom' ? 'Personalizado ativo' : 'Aplicar tema personalizado' }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
} from '@ionic/vue'
import { ApiError } from '@/api/client'
import { appearanceApi, type CustomThemeInfo, type ThemeInfo } from '@/api/appearance'
import { apiMessage, fieldErrors } from '@/composables/errors'
import { useShopStore } from '@/stores/shop'

const emit = defineEmits<{ denied: [] }>()

const router = useRouter()
const shop = useShopStore()

const loading = ref(true)
const applying = ref(false)
const uploading = ref(false)
const theme = ref<ThemeInfo | null>(null)
const custom = ref<CustomThemeInfo | null>(null)
const themeError = ref<string | null>(null)
const customError = ref<string | null>(null)
const pickedHtml = ref<File | null>(null)
const pickedCss = ref<File | null>(null)

const publicUrl = computed(() => shop.store?.public_url ?? null)

function formatSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** 403 neste grupo é sempre permissão (sem plano) → a aba some. */
async function handleLoadError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    await router.replace({ name: 'login' })
    return
  }
  if (e instanceof ApiError && e.status === 403) {
    emit('denied')
    return
  }
  themeError.value = apiMessage(e)
}

async function load() {
  loading.value = true
  themeError.value = null
  try {
    const [t, c] = await Promise.all([appearanceApi.theme(), appearanceApi.custom()])
    theme.value = t.data
    custom.value = c.data
  } catch (e: unknown) {
    await handleLoadError(e)
  } finally {
    loading.value = false
  }
}

async function applyTheme(key: string) {
  applying.value = true
  themeError.value = null
  try {
    theme.value = await appearanceApi.updateTheme(key)
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleLoadError(e)
      return
    }
    // 422 (ex.: `food` fora do segmento) mostra a mensagem do servidor.
    const fields = fieldErrors(e)
    themeError.value = Object.values(fields)[0]?.[0] ?? apiMessage(e)
  } finally {
    applying.value = false
  }
}

function onPick(kind: 'html' | 'css', event: Event) {
  customError.value = null
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] ?? null
  if (input) input.value = ''
  if (!file) return
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (kind === 'html' && !['html', 'htm'].includes(ext)) {
    customError.value = 'Arquivo HTML inválido — envie .html ou .htm.'
    return
  }
  if (kind === 'css' && ext !== 'css') {
    customError.value = 'Arquivo CSS inválido — envie .css.'
    return
  }
  if (file.size > 256 * 1024) {
    customError.value = 'Arquivo muito grande — o limite é de 256 KB.'
    return
  }
  if (kind === 'html') pickedHtml.value = file
  else pickedCss.value = file
}

async function uploadCustom() {
  if (!pickedHtml.value && !pickedCss.value) return
  uploading.value = true
  customError.value = null
  const before = custom.value
  try {
    custom.value = await appearanceApi.updateCustom({
      html: pickedHtml.value,
      css: pickedCss.value,
    })
    // Integridade (multipart em PUT pode ser descartado pelo PHP — ver STATUS):
    // se nada mudou nos flags, avisa em vez de fingir sucesso.
    const changed =
      (Boolean(pickedHtml.value) && custom.value.has_html !== before?.has_html) ||
      (Boolean(pickedCss.value) && custom.value.has_css !== before?.has_css) ||
      (custom.value.html_size !== before?.html_size || custom.value.css_size !== before?.css_size)
    if (!changed) {
      customError.value =
        'A API não recebeu os arquivos (upload por PUT multipart indisponível nesta versão). Use o painel web ou atualize a API.'
    } else {
      pickedHtml.value = null
      pickedCss.value = null
      // Recarrega o tema (pode ter ganhado `has_custom`).
      const { data } = await appearanceApi.theme()
      theme.value = data
    }
  } catch (e: unknown) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      await handleLoadError(e)
      return
    }
    const fields = fieldErrors(e)
    customError.value = Object.values(fields)[0]?.[0] ?? apiMessage(e)
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 10px;
}
.theme-card {
  border: 1px solid var(--yz-mist);
  border-radius: var(--yz-radius-md);
  overflow: hidden;
  background: var(--yz-card);
}
.theme-card.active {
  border-color: var(--ion-color-success);
  box-shadow: 0 0 0 1px var(--ion-color-success);
}
.theme-preview {
  padding: 12px;
  background: var(--yz-mint);
}
.tp-bar,
.tp-hero,
.tp-products {
  display: flex;
  gap: 6px;
  align-items: center;
}
.tp-bar b {
  width: 26px;
  height: 10px;
  border-radius: 5px;
  background: var(--yz-primary);
}
.tp-bar span {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--yz-mist);
}
.tp-bar i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--yz-primary);
}
.tp-hero {
  margin: 8px 0;
}
.tp-hero span {
  flex: 1;
  height: 26px;
  border-radius: 6px;
  background: var(--yz-mist);
}
.tp-hero em {
  width: 34px;
  height: 26px;
  border-radius: 6px;
  background: var(--yz-primary);
}
.tp-products i {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  background: var(--yz-card);
  border: 1px solid var(--yz-mist);
}
.theme-body {
  padding: 12px;
}
.theme-body h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--ion-text-color);
}
.file-row {
  margin: 12px 0;
}
.file-label {
  display: block;
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: var(--ion-text-color);
}
.file-row input[type='file'] {
  width: 100%;
  font-size: 0.85rem;
  color: var(--ion-text-color);
}
.picked {
  margin: 4px 0 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--yz-primary);
}
.hint code {
  font-size: 0.78rem;
}
</style>
