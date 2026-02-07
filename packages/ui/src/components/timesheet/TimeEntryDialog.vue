<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500" persistent>
    <v-card>
      <v-card-title>
        {{ isEdit ? $t('timesheet.entry.editEntry') : $t('timesheet.entry.newEntry') }}
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="handleSave">
          <!-- Ticket search -->
          <v-autocomplete
            v-model="form.ticketId"
            :items="ticketOptions"
            item-value="value"
            item-title="title"
            :label="$t('timesheet.entry.ticket')"
            :placeholder="$t('timesheet.entry.selectTicket')"
            prepend-inner-icon="mdi-ticket-outline"
            :rules="[rules.required]"
            variant="outlined"
            density="compact"
            class="mb-2"
            @update:search="searchTickets"
            :loading="searchLoading"
            no-filter
          />

          <!-- Date -->
          <v-text-field
            v-model="form.date"
            :label="$t('timesheet.entry.date')"
            type="date"
            :rules="[rules.required]"
            variant="outlined"
            density="compact"
            class="mb-2"
          />

          <!-- Start/End time row -->
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="form.startTime"
                :label="$t('timesheet.entry.startTime')"
                type="time"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="form.endTime"
                :label="$t('timesheet.entry.endTime')"
                type="time"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <!-- Duration display -->
          <v-text-field
            :model-value="durationDisplay"
            :label="$t('timesheet.entry.duration')"
            readonly
            variant="outlined"
            density="compact"
            class="mb-2"
            prepend-inner-icon="mdi-clock-outline"
          />

          <!-- Description -->
          <v-textarea
            v-model="form.description"
            :label="$t('timesheet.entry.description')"
            variant="outlined"
            density="compact"
            rows="2"
            auto-grow
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn
          v-if="isEdit"
          color="error"
          variant="text"
          @click="handleDelete"
        >
          {{ $t('common.actions.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          {{ $t('common.actions.cancel') }}
        </v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave">
          {{ $t('common.actions.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTicketsStore } from '@/store/tickets'
import { format } from 'date-fns'

const { t } = useI18n()
const ticketsStore = useTicketsStore()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  entry: { type: Object, default: null },
  prefilledDate: { type: String, default: null },
  prefilledHour: { type: Number, default: null },
  prefilledTicketId: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'save', 'delete'])

const formRef = ref(null)
const searchLoading = ref(false)
const ticketOptions = ref([])

const form = ref({
  ticketId: '',
  date: '',
  startTime: '',
  endTime: '',
  description: '',
})

const isEdit = computed(() => !!props.entry)

const rules = {
  required: (v) => !!v || t('validation.required', { field: '' }),
}

const durationDisplay = computed(() => {
  if (!form.value.startTime || !form.value.endTime) return ''
  const [sh, sm] = form.value.startTime.split(':').map(Number)
  const [eh, em] = form.value.endTime.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.entry) {
        // Edit mode
        form.value = {
          ticketId: props.entry.ticketId?._id || '',
          date: format(new Date(props.entry.date), 'yyyy-MM-dd'),
          startTime: props.entry.startTime,
          endTime: props.entry.endTime,
          description: props.entry.description || '',
        }
        if (props.entry.ticketId) {
          ticketOptions.value = [
            {
              value: props.entry.ticketId._id,
              title: `${props.entry.ticketId.key} - ${props.entry.ticketId.summary}`,
            },
          ]
        }
      } else {
        // Create mode
        form.value = {
          ticketId: props.prefilledTicketId || '',
          date: props.prefilledDate || format(new Date(), 'yyyy-MM-dd'),
          startTime: props.prefilledHour != null
            ? `${props.prefilledHour.toString().padStart(2, '0')}:00`
            : '09:00',
          endTime: props.prefilledHour != null
            ? `${(props.prefilledHour + 1).toString().padStart(2, '0')}:00`
            : '10:00',
          description: '',
        }
        loadInitialTickets()
      }
    }
  },
)

async function loadInitialTickets() {
  searchLoading.value = true
  try {
    const results = await ticketsStore.searchTickets('')
    ticketOptions.value = results.map((t) => ({
      value: t._id,
      title: `${t.key} - ${t.summary}`,
    }))
  } finally {
    searchLoading.value = false
  }
}

async function searchTickets(query) {
  if (query == null) return
  searchLoading.value = true
  try {
    const results = await ticketsStore.searchTickets(query)
    ticketOptions.value = results.map((t) => ({
      value: t._id,
      title: `${t.key} - ${t.summary}`,
    }))
  } finally {
    searchLoading.value = false
  }
}

async function handleSave() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const data = { ...form.value }
  if (isEdit.value) {
    data._id = props.entry._id
  }
  emit('save', data)
}

function handleDelete() {
  if (props.entry) {
    emit('delete', props.entry._id)
  }
}
</script>
