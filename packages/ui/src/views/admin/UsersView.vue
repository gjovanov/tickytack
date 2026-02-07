<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">{{ $t('admin.user.title') }}</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        {{ $t('admin.user.addUser') }}
      </v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="users"
      :loading="loading"
      density="compact"
    >
      <template #item.role="{ item }">
        <v-chip size="small" :color="roleColor(item.role)">
          {{ $t(`common.roles.${item.role}`) }}
        </v-chip>
      </template>
      <template #item.isActive="{ item }">
        <v-icon :color="item.isActive ? 'success' : 'grey'">
          {{ item.isActive ? 'mdi-check-circle' : 'mdi-close-circle' }}
        </v-icon>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditDialog(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card>
        <v-card-title>
          {{ editItem ? $t('admin.user.editUser') : $t('admin.user.addUser') }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  v-model="form.firstName"
                  :label="$t('admin.user.firstName')"
                  :rules="[v => !!v || $t('validation.required', { field: $t('admin.user.firstName') })]"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.lastName"
                  :label="$t('admin.user.lastName')"
                  :rules="[v => !!v || $t('validation.required', { field: $t('admin.user.lastName') })]"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-text-field
              v-model="form.email"
              :label="$t('admin.user.email')"
              type="email"
              :rules="[v => !!v || $t('validation.required', { field: $t('admin.user.email') })]"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-text-field
              v-model="form.username"
              :label="$t('admin.user.username')"
              :rules="[v => !!v || $t('validation.required', { field: $t('admin.user.username') })]"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-text-field
              v-model="form.password"
              :label="$t('admin.user.password')"
              type="password"
              :rules="editItem ? [] : [v => !!v || $t('validation.required', { field: $t('admin.user.password') })]"
              :hint="editItem ? 'Leave blank to keep current password' : ''"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-select
              v-model="form.role"
              :items="roleOptions"
              :label="$t('admin.user.role')"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-switch
              v-if="editItem"
              v-model="form.isActive"
              :label="$t('admin.user.isActive')"
              color="success"
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
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import httpClient from '@/services/http-client'

const { t } = useI18n()
const appStore = useAppStore()

const users = ref([])
const loading = ref(false)
const dialog = ref(false)
const editItem = ref(null)
const formRef = ref(null)
const form = ref({
  firstName: '', lastName: '', email: '', username: '', password: '', role: 'member', isActive: true,
})

const roleOptions = ['admin', 'manager', 'member']

const headers = [
  { title: t('admin.user.username'), key: 'username' },
  { title: t('admin.user.firstName'), key: 'firstName' },
  { title: t('admin.user.lastName'), key: 'lastName' },
  { title: t('admin.user.email'), key: 'email' },
  { title: t('admin.user.role'), key: 'role' },
  { title: t('admin.user.isActive'), key: 'isActive' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

function roleColor(role) {
  return { admin: 'red', manager: 'orange', member: 'blue' }[role] || 'grey'
}

async function fetchUsers() {
  if (!appStore.currentOrg) return
  loading.value = true
  try {
    const { data } = await httpClient.get(`/org/${appStore.currentOrg.id}/user`)
    users.value = data
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editItem.value = null
  form.value = { firstName: '', lastName: '', email: '', username: '', password: '', role: 'member', isActive: true }
  dialog.value = true
}

function openEditDialog(item) {
  editItem.value = item
  form.value = {
    firstName: item.firstName,
    lastName: item.lastName,
    email: item.email,
    username: item.username,
    password: '',
    role: item.role,
    isActive: item.isActive,
  }
  dialog.value = true
}

async function handleSave() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const payload = { ...form.value }
  if (!payload.password) delete payload.password

  if (editItem.value) {
    await httpClient.put(`/org/${appStore.currentOrg.id}/user/${editItem.value._id}`, payload)
  } else {
    await httpClient.post(`/org/${appStore.currentOrg.id}/user`, payload)
  }
  dialog.value = false
  fetchUsers()
}

async function confirmDelete(item) {
  if (confirm(t('messages.confirm.delete', { item: item.username }))) {
    await httpClient.delete(`/org/${appStore.currentOrg.id}/user/${item._id}`)
    fetchUsers()
  }
}

onMounted(fetchUsers)
</script>
