<template>
  <v-toolbar density="compact" flat color="transparent">
    <v-btn icon="mdi-chevron-left" variant="text" @click="$emit('previous')" />
    <v-btn variant="tonal" size="small" @click="$emit('today')">
      {{ $t('common.actions.today') }}
    </v-btn>
    <v-btn icon="mdi-chevron-right" variant="text" @click="$emit('next')" />

    <v-toolbar-title class="text-body-1 font-weight-medium ml-4">
      {{ formattedRange }}
    </v-toolbar-title>

    <v-spacer />

    <v-btn-toggle
      :model-value="viewMode"
      @update:model-value="$emit('view-mode', $event)"
      mandatory
      density="compact"
      variant="outlined"
    >
      <v-btn value="daily" size="small">{{ $t('timesheet.calendar.daily') }}</v-btn>
      <v-btn value="weekly" size="small">{{ $t('timesheet.calendar.weekly') }}</v-btn>
      <v-btn value="monthly" size="small">{{ $t('timesheet.calendar.monthly') }}</v-btn>
    </v-btn-toggle>
  </v-toolbar>
</template>

<script setup>
import { computed } from 'vue'
import { format, startOfWeek, endOfWeek } from 'date-fns'

const props = defineProps({
  currentDate: { type: Date, required: true },
  viewMode: { type: String, default: 'weekly' },
})

defineEmits(['previous', 'next', 'today', 'view-mode'])

const formattedRange = computed(() => {
  if (props.viewMode === 'daily') {
    return format(props.currentDate, 'EEE, MMM d, yyyy')
  }
  if (props.viewMode === 'monthly') {
    return format(props.currentDate, 'MMMM yyyy')
  }
  const start = startOfWeek(props.currentDate, { weekStartsOn: 1 })
  const end = endOfWeek(props.currentDate, { weekStartsOn: 1 })
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
})
</script>
