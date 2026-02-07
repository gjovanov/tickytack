<template>
  <v-card variant="outlined" class="mt-2 pa-3">
    <div class="d-flex align-center justify-space-between">
      <div
        v-for="day in dailyTotals"
        :key="day.date"
        class="text-center flex-grow-1"
      >
        <div class="text-caption text-medium-emphasis">{{ day.dayName }}</div>
        <div
          class="text-body-2 font-weight-medium"
          :class="{
            'text-success': day.hours >= 8,
            'text-warning': day.hours > 0 && day.hours < 8,
          }"
        >
          {{ day.hours.toFixed(1) }}h
        </div>
      </div>
      <div class="text-center px-4" style="min-width: 100px">
        <div class="text-caption font-weight-bold">
          {{ $t('timesheet.summary.weeklyTotal') }}
        </div>
        <div class="text-h6 font-weight-bold" :class="weeklyTotalColor">
          {{ weeklyTotal.toFixed(1) }}h
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { addDays, format, startOfWeek } from 'date-fns'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  weekStart: { type: Date, required: true },
})

const dailyTotals = computed(() => {
  const start = startOfWeek(props.weekStart, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayEntries = props.entries.filter(
      (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr,
    )
    const totalMinutes = dayEntries.reduce(
      (sum, e) => sum + (e.durationMinutes || 0),
      0,
    )
    return {
      date: dateStr,
      dayName: format(date, 'EEE'),
      hours: totalMinutes / 60,
    }
  })
})

const weeklyTotal = computed(() =>
  dailyTotals.value.reduce((sum, d) => sum + d.hours, 0),
)

const weeklyTotalColor = computed(() => {
  if (weeklyTotal.value >= 40) return 'text-success'
  if (weeklyTotal.value > 0) return 'text-warning'
  return ''
})
</script>
