<template>
  <div>
    <PageHead v-if="showTitle" title="Usuários" sub="Equipe da loja" />

    <div v-if="busy" class="yz-state">
      <ion-spinner></ion-spinner>
      <p>Carregando equipe…</p>
    </div>

    <ion-text v-else-if="error" color="danger">
      <div class="yz-state">
        <ion-icon name="people-outline"></ion-icon>
        <h3>Não foi possível carregar</h3>
        <p>{{ error }}</p>
        <ion-button fill="outline" @click="load">Tentar de novo</ion-button>
      </div>
    </ion-text>

    <template v-else-if="team">
      <!-- Slots do plano (real: GET /store/team → slots {used,max}) -->
      <ion-card>
        <ion-card-content>
          <div class="row-between">
            <div>
              <p class="stat-label">Vagas do plano</p>
              <p class="stat-num small">{{ team.slots.used }} / {{ team.slots.max }}</p>
            </div>
            <div class="icon-chip chip-blue">
              <ion-icon name="people-outline"></ion-icon>
            </div>
          </div>
          <ion-progress-bar
            class="ion-margin-top"
            :value="team.slots.max ? team.slots.used / team.slots.max : 0"
          ></ion-progress-bar>
        </ion-card-content>
      </ion-card>

      <!-- Formulário: novo membro -->
      <ion-card v-if="showForm">
        <ion-card-content>
          <h2 class="card-title">{{ editingId ? 'Editar membro' : 'Novo membro' }}</h2>
          <form @submit.prevent="saveMember">
            <template v-if="!editingId">
              <ion-item lines="full" class="yz-field">
                <ion-input v-model="memberForm.name" label="Nome" label-placement="floating" required />
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="memberForm.email"
                  type="email"
                  label="E-mail"
                  label-placement="floating"
                  required
                />
              </ion-item>
              <ion-item lines="full" class="yz-field">
                <ion-input
                  v-model="memberForm.password"
                  type="password"
                  label="Senha (mín. 8)"
                  label-placement="floating"
                  :minlength="8"
                  required
                />
              </ion-item>
            </template>

            <p class="stat-label">Permissões</p>
            <ion-item
              v-for="(label, key) in team.permissions"
              :key="key"
              lines="none"
              class="perm-row"
            >
              <ion-label>{{ label }}</ion-label>
              <ion-checkbox
                slot="end"
                :checked="memberForm.permissions.includes(key)"
                @ionChange="togglePermission(key, detailChecked($event))"
              ></ion-checkbox>
            </ion-item>

            <ion-item lines="none" class="perm-row">
              <ion-label>
                Ativo
                <p class="hint">Membro desativado não entra na loja.</p>
              </ion-label>
              <ion-toggle
                slot="end"
                :checked="memberForm.is_active"
                @ionChange="memberForm.is_active = detailChecked($event)"
              ></ion-toggle>
            </ion-item>

            <p v-if="formError" class="err-text">{{ formError }}</p>
            <div class="yz-actions">
              <ion-button type="submit" :disabled="saving">
                {{ saving ? 'Salvando…' : 'Salvar' }}
              </ion-button>
              <ion-button fill="outline" type="button" @click="closeForm">Cancelar</ion-button>
            </div>
          </form>
        </ion-card-content>
      </ion-card>

      <div v-else class="yz-actions" style="margin-bottom: 14px">
        <ion-button @click="openCreate">
          <ion-icon slot="start" name="person-add-outline"></ion-icon>Adicionar membro
        </ion-button>
      </div>

      <!-- Lista de membros -->
      <ion-card v-for="member in team.members" :key="member.id">
        <ion-card-content>
          <div class="row-between">
            <div class="member-head">
              <div class="avatar-a">{{ (member.name || '?').charAt(0).toUpperCase() }}</div>
              <div>
                <h3 class="card-title" style="margin: 0">{{ member.name }}</h3>
                <p class="hint">{{ member.email }}</p>
              </div>
            </div>
            <ion-toggle
              :checked="member.is_active"
              @ionChange="setActive(member, detailChecked($event))"
            ></ion-toggle>
          </div>

          <div class="yz-chips" style="margin-top: 8px">
            <ion-chip v-for="p in member.permissions" :key="p" color="primary">
              {{ team.permissions[p] ?? p }}
            </ion-chip>
            <ion-chip v-if="!member.permissions.length" color="medium">sem permissões</ion-chip>
          </div>

          <div class="yz-actions">
            <ion-button size="small" fill="outline" @click="openEdit(member)">
              <ion-icon slot="start" name="create-outline"></ion-icon>Editar
            </ion-button>
            <ion-button size="small" fill="outline" color="danger" @click="confirmRemove(member)">
              <ion-icon slot="start" name="trash-outline"></ion-icon>Remover
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="!team.members.length">
        <ion-card-content class="yz-state" style="padding: 24px 16px">
          <ion-icon name="people-outline"></ion-icon>
          <h3>Nenhum membro na equipe</h3>
          <p>Adicione pessoas para dividir a gestão da loja.</p>
        </ion-card-content>
      </ion-card>
    </template>

    <ion-toast
      :is-open="toastOpen"
      :message="toastMessage"
      :duration="2200"
      position="top"
      @didDismiss="toastOpen = false"
    ></ion-toast>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonChip,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonProgressBar,
  IonSpinner,
  IonText,
  IonToast,
  IonToggle,
} from '@ionic/vue'
import PageHead from '@/components/PageHead.vue'
import { storeApi, type TeamIndex, type TeamMember } from '@/api/store'
import { apiMessage, routeApiError } from '@/composables/errors'

/**
 * Gestão da equipe (GET/POST/PUT/DELETE /store/team — só titular, como no
 * painel). Reutilizado na rota /equipe e na aba Equipe das configurações
 * (lá sem o cabeçalho próprio). Sem o título, o painel não busca nada
 * sozinho: o pai só o monta quando a aba é ativada.
 */
withDefaults(defineProps<{ showTitle?: boolean }>(), { showTitle: true })

const router = useRouter()

const team = ref<TeamIndex | null>(null)
const busy = ref(true)
const error = ref<string | null>(null)
const showForm = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formError = ref<string | null>(null)
const toastOpen = ref(false)
const toastMessage = ref('')

const memberForm = reactive<{
  name: string
  email: string
  password: string
  permissions: string[]
  is_active: boolean
}>({
  name: '',
  email: '',
  password: '',
  permissions: [],
  is_active: true,
})

function detailChecked(event: unknown): boolean {
  const detail = (event as CustomEvent<{ checked?: boolean }>)?.detail
  return Boolean(detail?.checked)
}

function toast(message: string) {
  toastMessage.value = message
  toastOpen.value = true
}

async function load() {
  busy.value = true
  error.value = null
  try {
    const { data } = await storeApi.team()
    team.value = data
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    error.value = apiMessage(e)
  } finally {
    busy.value = false
  }
}

function resetForm() {
  memberForm.name = ''
  memberForm.email = ''
  memberForm.password = ''
  memberForm.permissions = []
  memberForm.is_active = true
  formError.value = null
}

function openCreate() {
  resetForm()
  editingId.value = null
  showForm.value = true
}

function openEdit(member: TeamMember) {
  editingId.value = member.id
  memberForm.name = member.name
  memberForm.email = member.email
  memberForm.password = ''
  memberForm.permissions = [...member.permissions]
  memberForm.is_active = member.is_active
  formError.value = null
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

function togglePermission(key: string, checked: boolean) {
  const set = new Set(memberForm.permissions)
  if (checked) set.add(key)
  else set.delete(key)
  memberForm.permissions = [...set]
}

async function saveMember() {
  saving.value = true
  formError.value = null
  try {
    if (editingId.value) {
      // O backend grava is_active em TODO PUT — envie sempre o valor atual.
      await storeApi.teamUpdate(editingId.value, {
        permissions: memberForm.permissions,
        is_active: memberForm.is_active,
      })
      toast('Membro atualizado')
    } else {
      if (memberForm.password.length < 8) {
        formError.value = 'A senha precisa de ao menos 8 caracteres.'
        saving.value = false
        return
      }
      await storeApi.teamCreate({
        name: memberForm.name.trim(),
        email: memberForm.email.trim(),
        password: memberForm.password,
        permissions: memberForm.permissions,
        is_active: memberForm.is_active,
      })
      toast('Membro adicionado')
    }
    showForm.value = false
    editingId.value = null
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    formError.value = apiMessage(e)
  } finally {
    saving.value = false
  }
}

async function setActive(member: TeamMember, active: boolean) {
  try {
    await storeApi.teamUpdate(member.id, { permissions: member.permissions, is_active: active })
    toast(active ? 'Membro reativado' : 'Membro desativado')
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
    await load()
  }
}

async function confirmRemove(member: TeamMember) {
  const alert = await alertController.create({
    header: 'Remover membro?',
    message: `${member.name} perde o acesso à loja. O login dele continua existindo.`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Remover',
        role: 'destructive',
        handler: () => {
          void removeMember(member)
        },
      },
    ],
  })
  await alert.present()
}

async function removeMember(member: TeamMember) {
  try {
    await storeApi.teamRemove(member.id)
    toast('Membro removido')
    await load()
  } catch (e: unknown) {
    if (await routeApiError(e, router)) return
    toast(apiMessage(e))
  }
}

onMounted(load)
</script>

<style scoped>
.member-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.perm-row {
  --padding-start: 0;
  --padding-end: 0;
}
</style>
