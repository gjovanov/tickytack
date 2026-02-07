<template>
  <v-card variant="outlined" class="monthly-calendar">
    <v-progress-linear v-if="loading" indeterminate color="primary" />

    <!-- Weekday header -->
    <div class="calendar-header">
      <div
        v-for="dayName in weekDayNames"
        :key="dayName"
        class="header-cell text-caption font-weight-medium"
      >
        {{ dayName }}
      </div>
    </div>

    <!-- Month grid -->
    <div class="calendar-body">
      <div
        v-for="(week, wi) in weeks"
        :key="wi"
        class="week-row"
      >
        <div
          v-for="day in week"
          :key="day.dateStr"
          class="day-cell"
          :class="{
            'is-today': day.isToday,
            'other-month': !day.isCurrentMonth,
          }"
          @click="$emit('click-day', day.dateStr)"
        >
          <div class="day-number text-body-2" :class="{ 'font-weight-bold text-primary': day.isToday }">
            {{ day.dayNum }}
          </div>
          <div v-if="day.totalHours > 0" class="day-hours text-caption">
            {{ day.totalHours.toFixed(1) }}h
          </div>
          <div class="day-dots">
            <span
              v-for="color in day.projectColors.slice(0, 4)"
              :key="color"
              class="dot"
              :style="{ backgroundColor: color }"
            />
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isToday,
  isSameMonth,
} from 'date-fns'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  currentDate: { type: Date, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['click-day'])

const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const entriesByDate = computed(() => {
  const map = new Map()
  for (const entry of props.entries) {
    const dateStr = format(new Date(entry.date), 'yyyy-MM-dd')
    if (!map.has(dateStr)) {
      map.set(dateStr, [])
    }
    map.get(dateStr).push(entry)
  }
  return map
})

const weeks = computed(() => {
  const monthStart = startOfMonth(props.currentDate)
  const monthEnd = endOfMonth(props.currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const result = []
  let current = calStart
  let week = []

  while (current <= calEnd) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const dayEntries = entriesByDate.value.get(dateStr) || []
    const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
    const projectColors = [...new Set(dayEntries.map((e) => e.projectId?.color || '#1976D2'))]

    week.push({
      dateStr,
      dayNum: format(current, 'd'),
      isToday: isToday(current),
      isCurrentMonth: isSameMonth(current, props.currentDate),
      totalHours: totalMinutes / 60,
      projectColors,
    })

    if (week.length === 7) {
      result.push(week)
      week = []
    }
    current = addDays(current, 1)
  }

  return result
})
</script>

<style scoped>
.monthly-calendar {
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.header-cell {
  text-align: center;
  padding: 8px 4px;
}

.calendar-body {
  min-height: 400px;
}

.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.day-cell {
  min-height: 80px;
  padding: 4px 6px;
  border-right: 1px solid rgba(var(--v-border-color), 0.08);
  cursor: pointer;
  transition: background-color 0.15s;
}

.day-cell:last-child {
  border-right: none;
}

.day-cell:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.day-cell.is-today {
  background: rgba(var(--v-theme-primary), 0.08);
}

.day-cell.other-month {
  opacity: 0.4;
}

.day-number {
  margin-bottom: 2px;
}

.day-hours {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.day-dots {
  display: flex;
  gap: 3px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
