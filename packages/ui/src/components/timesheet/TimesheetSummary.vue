<template>
  <v-card variant="outlined" class="mt-2 pa-3">
    <!-- Daily mode: single day total -->
    <div v-if="mode === 'daily'" class="d-flex align-center justify-center">
      <div class="text-center">
        <div class="text-caption font-weight-bold">{{ $t('timesheet.summary.dailyTotal') }}</div>
        <div class="text-h6 font-weight-bold" :class="dailyTotalColor">
          {{ dailyTotal.toFixed(1) }}h
        </div>
      </div>
    </div>

    <!-- Weekly mode: 7 day boxes + weekly total -->
    <div v-else-if="mode === 'weekly'" class="d-flex align-center justify-space-between">
      <div
        v-for="day in weeklyDailyTotals"
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

    <!-- Monthly mode: week rows + month total -->
    <div v-else-if="mode === 'monthly'">
      <div
        v-for="week in monthlyWeekTotals"
        :key="week.label"
        class="d-flex align-center justify-space-between py-1"
      >
        <span class="text-caption text-medium-emphasis">{{ week.label }}</span>
        <span
          class="text-body-2 font-weight-medium"
          :class="{
            'text-success': week.hours >= 40,
            'text-warning': week.hours > 0 && week.hours < 40,
          }"
        >
          {{ week.hours.toFixed(1) }}h
        </span>
      </div>
      <v-divider class="my-1" />
      <div class="d-flex align-center justify-space-between">
        <span class="text-caption font-weight-bold">{{ $t('timesheet.summary.monthlyTotal') }}</span>
        <span class="text-h6 font-weight-bold" :class="monthlyTotalColor">
          {{ monthlyTotal.toFixed(1) }}h
        </span>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { addDays, format, startOfWeek, getISOWeek, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  weekStart: { type: Date, default: null },
  currentDate: { type: Date, default: null },
  mode: { type: String, default: 'weekly' }, // 'daily' | 'weekly' | 'monthly'
})

// --- Daily ---
const dailyTotal = computed(() => {
  const totalMinutes = props.entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
  return totalMinutes / 60
})

const dailyTotalColor = computed(() => {
  if (dailyTotal.value >= 8) return 'text-success'
  if (dailyTotal.value > 0) return 'text-warning'
  return ''
})

// --- Weekly ---
const weeklyDailyTotals = computed(() => {
  if (!props.weekStart) return []
  const start = startOfWeek(props.weekStart, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayEntries = props.entries.filter(
      (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr,
    )
    const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
    return {
      date: dateStr,
      dayName: format(date, 'EEE'),
      hours: totalMinutes / 60,
    }
  })
})

const weeklyTotal = computed(() =>
  weeklyDailyTotals.value.reduce((sum, d) => sum + d.hours, 0),
)

const weeklyTotalColor = computed(() => {
  if (weeklyTotal.value >= 40) return 'text-success'
  if (weeklyTotal.value > 0) return 'text-warning'
  return ''
})

// --- Monthly ---
const monthlyWeekTotals = computed(() => {
  if (!props.currentDate) return []
  const monthStart = startOfMonth(props.currentDate)
  const monthEnd = endOfMonth(props.currentDate)
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })

  return weeks.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6)
    const weekEntries = props.entries.filter((e) => {
      const d = new Date(e.date)
      return d >= weekStart && d <= weekEnd
    })
    const totalMinutes = weekEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
    return {
      label: `W${getISOWeek(weekStart)} (${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')})`,
      hours: totalMinutes / 60,
    }
  })
})

const monthlyTotal = computed(() =>
  monthlyWeekTotals.value.reduce((sum, w) => sum + w.hours, 0),
)

const monthlyTotalColor = computed(() => {
  if (monthlyTotal.value >= 160) return 'text-success'
  if (monthlyTotal.value > 0) return 'text-warning'
  return ''
})
</script>
