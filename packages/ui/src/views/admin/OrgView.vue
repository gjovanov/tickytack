<template>
  <v-container>
    <v-row>
      <v-col>
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5">{{ $t('admin.org.title') }}</h2>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
            {{ $t('admin.org.createOrg') }}
          </v-btn>
        </div>

        <v-data-table
          :headers="headers"
          :items="orgs"
          :loading="loading"
          density="compact"
        >
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditDialog(item)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
          </template>
        </v-data-table>

        <!-- Create/Edit dialog -->
        <v-dialog v-model="dialog" max-width="500" persistent>
          <v-card>
            <v-card-title>
              {{ editItem ? $t('admin.org.editOrg') : $t('admin.org.createOrg') }}
            </v-card-title>
            <v-card-text>
              <v-form ref="formRef">
                <v-text-field
                  v-model="form.name"
                  :label="$t('admin.org.name')"
                  :rules="[v => !!v || $t('validation.required', { field: $t('admin.org.name') })]"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />
                <v-text-field
                  v-if="!editItem"
                  v-model="form.slug"
                  :label="$t('admin.org.slug')"
                  :rules="[v => !!v || $t('validation.required', { field: $t('admin.org.slug') })]"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />
                <v-textarea
                  v-model="form.description"
                  :label="$t('admin.org.description')"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  class="mb-2"
                />
                <v-text-field
                  v-model.number="form.settings.workingHoursPerDay"
                  :label="$t('admin.org.workingHours')"
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
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import httpClient from '@/services/http-client'

const { t } = useI18n()

const orgs = ref([])
const loading = ref(false)
const dialog = ref(false)
const editItem = ref(null)
const formRef = ref(null)
const form = ref({ name: '', slug: '', description: '', settings: { workingHoursPerDay: 8 } })

const headers = [
  { title: t('admin.org.name'), key: 'name' },
  { title: t('admin.org.slug'), key: 'slug' },
  { title: t('admin.org.workingHours'), key: 'settings.workingHoursPerDay' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

async function fetchOrgs() {
  loading.value = true
  try {
    const { data } = await httpClient.get('/org')
    orgs.value = data
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editItem.value = null
  form.value = { name: '', slug: '', description: '', settings: { workingHoursPerDay: 8 } }
  dialog.value = true
}

function openEditDialog(item) {
  editItem.value = item
  form.value = {
    name: item.name,
    slug: item.slug,
    description: item.description || '',
    settings: { workingHoursPerDay: item.settings?.workingHoursPerDay || 8 },
  }
  dialog.value = true
}

async function handleSave() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (editItem.value) {
    await httpClient.put(`/org/${editItem.value._id}`, {
      name: form.value.name,
      description: form.value.description,
      settings: form.value.settings,
    })
  } else {
    // Create via register flow - orgs are created during registration
  }
  dialog.value = false
  fetchOrgs()
}

async function confirmDelete(item) {
  if (confirm(t('messages.confirm.delete', { item: item.name }))) {
    await httpClient.delete(`/org/${item._id}`)
    fetchOrgs()
  }
}

onMounted(fetchOrgs)
</script>
