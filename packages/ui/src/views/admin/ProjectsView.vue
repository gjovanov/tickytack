<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">{{ $t('admin.project.title') }}</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        {{ $t('admin.project.createProject') }}
      </v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="projectsStore.projects"
      :loading="projectsStore.loading"
      density="compact"
    >
      <template #item.color="{ item }">
        <v-avatar size="20" :color="item.color" />
      </template>
      <template #item.leadId="{ item }">
        {{ item.leadId ? `${item.leadId.firstName} ${item.leadId.lastName}` : '-' }}
      </template>
      <template #item.isActive="{ item }">
        <v-chip :color="item.isActive ? 'success' : 'grey'" size="small">
          {{ item.isActive ? $t('common.status.active') : $t('common.status.inactive') }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditDialog(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card>
        <v-card-title>
          {{ editItem ? $t('admin.project.editProject') : $t('admin.project.createProject') }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="form.name"
              :label="$t('admin.project.name')"
              :rules="[v => !!v || $t('validation.required', { field: $t('admin.project.name') })]"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-text-field
              v-model="form.key"
              :label="$t('admin.project.key')"
              :rules="[v => !!v || $t('validation.required', { field: $t('admin.project.key') })]"
              hint="e.g. PCON, TTT"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-textarea
              v-model="form.description"
              :label="$t('admin.project.description')"
              variant="outlined"
              density="compact"
              rows="2"
              class="mb-2"
            />
            <v-text-field
              v-model="form.color"
              :label="$t('admin.project.color')"
              type="color"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">{{ $t('common.actions.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" @click="handleSave">{{ $t('common.actions.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProjectsStore } from '@/store/projects'
import { useSnackbar } from '@/composables/useSnackbar'

const { t } = useI18n()
const projectsStore = useProjectsStore()
const { showError, showSuccess } = useSnackbar()

const dialog = ref(false)
const editItem = ref(null)
const formRef = ref(null)
const form = ref({ name: '', key: '', description: '', color: '#1976D2' })

const headers = [
  { title: t('admin.project.color'), key: 'color', sortable: false, width: 50 },
  { title: t('admin.project.key'), key: 'key' },
  { title: t('admin.project.name'), key: 'name' },
  { title: t('admin.project.lead'), key: 'leadId' },
  { title: t('admin.user.isActive'), key: 'isActive' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

function openCreateDialog() {
  editItem.value = null
  form.value = { name: '', key: '', description: '', color: '#1976D2' }
  dialog.value = true
}

function openEditDialog(item) {
  editItem.value = item
  form.value = {
    name: item.name,
    key: item.key,
    description: item.description || '',
    color: item.color || '#1976D2',
  }
  dialog.value = true
}

async function handleSave() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    if (editItem.value) {
      await projectsStore.updateProject(editItem.value._id, form.value)
    } else {
      await projectsStore.createProject(form.value)
    }
    dialog.value = false
    showSuccess(editItem.value ? 'Project updated' : 'Project created')
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Operation failed')
  }
}

async function confirmDelete(item) {
  if (!confirm(t('messages.confirm.delete', { item: item.name }))) return
  try {
    await projectsStore.deleteProject(item._id)
    showSuccess('Project deleted')
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Delete failed')
  }
}

onMounted(() => projectsStore.fetchProjects())
</script>
