<!-- RichTextEditor — descrição de produto com paridade ao CKEditor 4 do web.
  -
  - Toolbar do web (`public/assets/js/catalog/admin/products/form.js`, ~l.242):
  - mobile usa Bold/Italic/Underline/RemoveFormat + listas + Link/Unlink; no
  - desktop o CKEditor 4 full soma títulos (Format) e o resto da barra padrão.
  - Este editor expõe o mesmo subset nos dois modos: títulos (H1/H2), B/I/U,
  - listas, link e limpar formatação — HTML que a API aceita e renderiza
  - (sanitização final no servidor: `MobileProductController@safeHtml`).
  -
  - Lib: TipTap 3 (MIT, Vue 3.5, touch-friendly, saída HTML limpa). Toolbar com
  - alvos ≥40px, rolagem horizontal no mobile, `aria-pressed` por botão e
  - contraste total via vars do tema (light/dark auditado).
-->
<template>
  <div class="rte" :class="{ disabled }">
    <p v-if="label" class="rte-label">{{ label }}</p>

    <div class="rte-toolbar" role="toolbar" :aria-label="`${label} — formatação`">
      <button
        v-for="btn in buttons"
        :key="btn.name"
        type="button"
        class="rte-btn"
        :class="{ active: btn.isActive() }"
        :aria-label="btn.label"
        :title="btn.label"
        :aria-pressed="btn.isActive()"
        :disabled="disabled || !editor"
        @click="btn.run"
      >
        <ion-icon v-if="btn.icon" :name="btn.icon" aria-hidden="true"></ion-icon>
        <span v-else class="rte-glyph" :class="btn.glyphClass" aria-hidden="true">{{ btn.glyph }}</span>
      </button>
    </div>

    <!-- Barra de link inline (sem `prompt`, melhor no touch). -->
    <div v-if="linkBar" class="rte-linkbar">
      <ion-input
        v-model="linkDraft"
        label="URL do link (https://…)"
        label-placement="floating"
        inputmode="url"
        :disabled="disabled"
      />
      <div class="yz-actions">
        <ion-button size="small" :disabled="disabled" @click="applyLink">Aplicar</ion-button>
        <ion-button size="small" fill="outline" @click="closeLinkBar">Cancelar</ion-button>
      </div>
      <p v-if="linkError" class="err-text">{{ linkError }}</p>
    </div>

    <editor-content v-if="editor" :editor="editor" class="rte-area" />
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonButton, IonIcon, IonInput } from '@ionic/vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    hint?: string | null
    disabled?: boolean
  }>(),
  {
    label: 'Descrição',
    placeholder: 'Detalhes exibidos na página do produto…',
    hint: null,
    disabled: false,
  },
)

const model = defineModel<string>({ default: '' })

const linkBar = ref(false)
const linkDraft = ref('')
const linkError = ref<string | null>(null)

const editor = useEditor({
  content: model.value || '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      // Subset do CKEditor do web: títulos até H2 + listas + ênfases.
      heading: { levels: [1, 2] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      // Só http/https — defesa em profundidade (o servidor sanitiza o resto).
      validate: (href) => /^https?:\/\//i.test(href),
    }),
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  onUpdate: ({ editor: updated }) => {
    const html = updated.getHTML()
    if (html !== model.value) model.value = html === '<p></p>' ? '' : html
  },
})

watch(
  () => props.disabled,
  (value) => editor.value?.setEditable(!value),
)

/** Conteúdo vindo de fora (ex.: carregamento da edição) — sem loop. */
watch(model, (value) => {
  const current = editor.value?.getHTML() ?? ''
  const next = value || ''
  // `setContent` sem emitir update (padrão): não realimenta o `onUpdate`.
  if (editor.value && next !== current && (next !== '' || current !== '<p></p>')) {
    editor.value.commands.setContent(next)
  }
})

interface ToolButton {
  name: string
  label: string
  icon?: string
  glyph?: string
  glyphClass?: string
  isActive: () => boolean
  run: () => void
}

const buttons = computed<ToolButton[]>(() => {
  const ed = editor.value
  const off = () => false
  const none = () => {}
  return [
    {
      name: 'bold',
      label: 'Negrito',
      glyph: 'B',
      glyphClass: 'w-bold',
      isActive: () => ed?.isActive('bold') ?? off(),
      run: () => ed?.chain().focus().toggleBold().run() ?? none(),
    },
    {
      name: 'italic',
      label: 'Itálico',
      glyph: 'I',
      glyphClass: 'w-italic',
      isActive: () => ed?.isActive('italic') ?? off(),
      run: () => ed?.chain().focus().toggleItalic().run() ?? none(),
    },
    {
      name: 'underline',
      label: 'Sublinhado',
      glyph: 'U',
      glyphClass: 'w-underline',
      isActive: () => ed?.isActive('underline') ?? off(),
      run: () => ed?.chain().focus().toggleUnderline().run() ?? none(),
    },
    {
      name: 'h1',
      label: 'Título grande',
      glyph: 'H1',
      isActive: () => ed?.isActive('heading', { level: 1 }) ?? off(),
      run: () => ed?.chain().focus().toggleHeading({ level: 1 }).run() ?? none(),
    },
    {
      name: 'h2',
      label: 'Título',
      glyph: 'H2',
      isActive: () => ed?.isActive('heading', { level: 2 }) ?? off(),
      run: () => ed?.chain().focus().toggleHeading({ level: 2 }).run() ?? none(),
    },
    {
      name: 'bullet',
      label: 'Lista com marcadores',
      icon: 'list-outline',
      isActive: () => ed?.isActive('bulletList') ?? off(),
      run: () => ed?.chain().focus().toggleBulletList().run() ?? none(),
    },
    {
      name: 'ordered',
      label: 'Lista numerada',
      glyph: '1.',
      isActive: () => ed?.isActive('orderedList') ?? off(),
      run: () => ed?.chain().focus().toggleOrderedList().run() ?? none(),
    },
    {
      name: 'link',
      label: 'Inserir link',
      icon: 'link-outline',
      isActive: () => ed?.isActive('link') ?? off(),
      run: () => openLinkBar(),
    },
    {
      name: 'unlink',
      label: 'Remover link',
      glyph: '⌀',
      isActive: () => false,
      run: () => ed?.chain().focus().unsetLink().run() ?? none(),
    },
    {
      name: 'clear',
      label: 'Remover formatação',
      icon: 'remove-circle-outline',
      isActive: () => false,
      run: () => ed?.chain().focus().unsetAllMarks().clearNodes().run() ?? none(),
    },
  ]
})

function openLinkBar() {
  linkError.value = null
  const previous = editor.value?.getAttributes('link').href ?? ''
  linkDraft.value = typeof previous === 'string' ? previous : ''
  linkBar.value = true
}

function closeLinkBar() {
  linkBar.value = false
  linkError.value = null
}

function applyLink() {
  const url = linkDraft.value.trim()
  if (!/^https?:\/\/.+/i.test(url)) {
    linkError.value = 'Use um endereço http:// ou https://.'
    return
  }
  editor.value?.chain().focus().setLink({ href: url }).run()
  closeLinkBar()
}
</script>

<style scoped>
.rte-label {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ion-text-color);
}
.rte-toolbar {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 6px;
  border: 1px solid var(--yz-mist);
  border-bottom: none;
  border-radius: var(--yz-radius-md) var(--yz-radius-md) 0 0;
  background: var(--yz-card);
  -webkit-overflow-scrolling: touch;
}
.rte-btn {
  flex: none;
  min-width: 40px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--ion-text-color);
  cursor: pointer;
  padding: 0 8px;
}
.rte-btn ion-icon {
  font-size: 1.25rem;
}
.rte-glyph {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
}
.rte-glyph.w-bold {
  font-weight: 800;
}
.rte-glyph.w-italic {
  font-style: italic;
}
.rte-glyph.w-underline {
  text-decoration: underline;
}
.rte-btn:hover {
  border-color: var(--yz-mist);
}
.rte-btn.active {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  color: #fff;
}
.rte-btn:focus-visible {
  outline: 2px solid var(--yz-primary);
  outline-offset: 1px;
}
.rte-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.rte-linkbar {
  border: 1px solid var(--yz-mist);
  border-top: none;
  padding: 8px 10px 10px;
  background: var(--yz-card);
}
.rte-area {
  border: 1px solid var(--yz-mist);
  border-top: 1px solid var(--yz-mist);
  border-radius: 0 0 var(--yz-radius-md) var(--yz-radius-md);
  background: var(--ion-card-background, var(--yz-card));
  min-height: 132px;
  padding: 10px 12px;
}
.rte-toolbar + .rte-linkbar + .rte-area,
.rte-toolbar + .rte-area {
  border-top: 1px solid var(--yz-mist);
}
.rte-area :deep(.tiptap) {
  min-height: 110px;
  color: var(--ion-text-color);
  font-size: 1rem;
  line-height: 1.55;
  outline: none;
}
.rte-area :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: var(--yz-muted);
}
.rte-area :deep(.tiptap h1),
.rte-area :deep(.tiptap h2) {
  color: var(--ion-text-color);
  line-height: 1.3;
  margin: 0.6em 0 0.4em;
}
.rte-area :deep(.tiptap h1) {
  font-size: 1.3rem;
}
.rte-area :deep(.tiptap h2) {
  font-size: 1.12rem;
}
.rte-area :deep(.tiptap ul),
.rte-area :deep(.tiptap ol) {
  padding-left: 1.4rem;
  margin: 0.4em 0;
}
.rte-area :deep(.tiptap a) {
  color: var(--yz-primary);
  text-decoration: underline;
}
.rte-area :deep(.tiptap p) {
  margin: 0.4em 0;
}
.rte.disabled {
  opacity: 0.7;
}
</style>
