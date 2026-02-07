<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">{{ $t('admin.ticket.title') }}</h2>
      <v-spacer />
      <v-select
        v-model="selectedProjectIds"
        :items="projectOptions"
        item-value="value"
        item-title="title"
        :label="$t('admin.ticket.project')"
        variant="outlined"
        density="compact"
        style="max-width: 350px"
        class="mr-4"
        hide-details
        multiple
        chips
        closable-chips
        @update:model-value="handleProjectChange"
      >
        <template #prepend-item>
          <v-list-item
            :title="allSelected ? $t('common.actions.deselectAll') : $t('common.actions.selectAll')"
            @click="toggleSelectAll"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="allSelected"
                :indeterminate="someSelected && !allSelected"
              />
            </template>
          </v-list-item>
          <v-divider class="mt-2" />
        </template>
      </v-select>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        :disabled="selectedProjectIds.length !== 1"
        @click="openCreateDialog"
      >
        {{ $t('admin.ticket.createTicket') }}
      </v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="ticketsStore.tickets"
      :loading="ticketsStore.loading"
      density="compact"
    >
      <template #item.status="{ item }">
        <v-chip :color="statusColor(item.status)" size="small">
          {{ $t(`common.status.${item.status}`) }}
        </v-chip>
      </template>
      <template #item.priority="{ item }">
        <v-chip :color="priorityColor(item.priority)" size="small" variant="outlined">
          {{ $t(`common.priority.${item.priority}`) }}
        </v-chip>
      </template>
      <template #item.assigneeId="{ item }">
        {{ item.assigneeId ? `${item.assigneeId.firstName} ${item.assigneeId.lastName}` : '-' }}
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditDialog(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editItem ? $t('admin.ticket.editTicket') : $t('admin.ticket.createTicket') }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="form.summary"
              :label="$t('admin.ticket.summary')"
              :rules="[v => !!v || $t('validation.required', { field: $t('admin.ticket.summary') })]"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-textarea
              v-model="form.description"
              :label="$t('admin.ticket.description')"
              variant="outlined"
              density="compact"
              rows="2"
              class="mb-2"
            />
            <v-row dense>
              <v-col cols="6">
                <v-select
                  v-model="form.status"
                  :items="statusOptions"
                  :label="$t('admin.ticket.status')"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="form.priority"
                  :items="priorityOptions"
                  :label="$t('admin.ticket.priority')"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-text-field
              v-model.number="form.estimatedHours"
              :label="$t('admin.ticket.estimatedHours')"
              type="number"
              variant="outlined"
              density="compact"
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
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTicketsStore } from '@/store/tickets'
import { useProjectsStore } from '@/store/projects'

const { t } = useI18n()
const ticketsStore = useTicketsStore()
const projectsStore = useProjectsStore()

const dialog = ref(false)
const editItem = ref(null)
const formRef = ref(null)
const selectedProjectIds = ref([])
const form = ref({ summary: '', description: '', status: 'open', priority: 'medium', estimatedHours: null })

const statusOptions = ['open', 'in_progress', 'done', 'closed']
const priorityOptions = ['lowest', 'low', 'medium', 'high', 'highest']

const headers = [
  { title: t('admin.ticket.key'), key: 'key' },
  { title: t('admin.ticket.summary'), key: 'summary' },
  { title: t('admin.ticket.status'), key: 'status' },
  { title: t('admin.ticket.priority'), key: 'priority' },
  { title: t('admin.ticket.assignee'), key: 'assigneeId' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const projectOptions = computed(() =>
  projectsStore.projects.map((p) => ({ value: p._id, title: `${p.key} - ${p.name}` })),
)

const allSelected = computed(() =>
  projectOptions.value.length > 0 && selectedProjectIds.value.length === projectOptions.value.length,
)
const someSelected = computed(() => selectedProjectIds.value.length > 0)

function toggleSelectAll() {
  if (allSelected.value) {
    selectedProjectIds.value = []
  } else {
    selectedProjectIds.value = projectOptions.value.map((p) => p.value)
  }
  handleProjectChange(selectedProjectIds.value)
}

function statusColor(status) {
  const colors = { open: 'blue', in_progress: 'orange', done: 'green', closed: 'grey' }
  return colors[status] || 'grey'
}

function priorityColor(priority) {
  const colors = { lowest: 'grey', low: 'blue', medium: 'orange', high: 'red', highest: 'red-darken-4' }
  return colors[priority] || 'grey'
}

function handleProjectChange(projectIds) {
  ticketsStore.fetchTicketsForProjects(projectIds)
}

function openCreateDialog() {
  editItem.value = null
  form.value = { summary: '', description: '', status: 'open', priority: 'medium', estimatedHours: null }
  dialog.value = true
}

function openEditDialog(item) {
  editItem.value = item
  form.value = {
    summary: item.summary,
    description: item.description || '',
    status: item.status,
    priority: item.priority,
    estimatedHours: item.estimatedHours,
  }
  dialog.value = true
}

async function handleSave() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (editItem.value) {
    const projectId = editItem.value.projectId?._id || editItem.value.projectId
    await ticketsStore.updateTicket(projectId, editItem.value._id, form.value)
  } else {
    await ticketsStore.createTicket(selectedProjectIds.value[0], form.value)
  }
  dialog.value = false
  handleProjectChange(selectedProjectIds.value)
}

async function confirmDelete(item) {
  if (confirm(t('messages.confirm.delete', { item: item.key }))) {
    const projectId = item.projectId?._id || item.projectId
    await ticketsStore.deleteTicket(projectId, item._id)
    handleProjectChange(selectedProjectIds.value)
  }
}

onMounted(() => projectsStore.fetchProjects())
</script>
