<template>
  <v-card variant="outlined" class="daily-calendar">
    <v-progress-linear v-if="loading" indeterminate color="primary" />

    <!-- Header -->
    <div class="calendar-header">
      <div class="time-gutter header-cell">
        <!-- empty -->
      </div>
      <div
        class="day-header header-cell"
        :class="{ 'is-today': dayInfo.isToday }"
      >
        <div class="text-caption font-weight-medium">{{ dayInfo.dayName }}</div>
        <div class="text-body-2" :class="{ 'font-weight-bold text-primary': dayInfo.isToday }">
          {{ dayInfo.dayNum }}
        </div>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="calendar-body" ref="calendarBody">
      <div class="calendar-grid">
        <!-- Time gutter -->
        <div class="time-gutter">
          <div
            v-for="hour in hours"
            :key="hour"
            class="hour-label"
          >
            <span class="text-caption text-medium-emphasis">{{ formatHour(hour) }}</span>
          </div>
        </div>

        <!-- Single day column -->
        <DailyColumn
          :date="dayInfo.dateStr"
          :entries="dayEntries"
          :is-today="dayInfo.isToday"
          @click-slot="(hour) => $emit('click-slot', { date: dayInfo.dateStr, hour })"
          @click-entry="(entry) => $emit('click-entry', entry)"
          @resize-entry="(data) => $emit('resize-entry', data)"
          @drop-entry="(data) => $emit('drop-entry', data)"
        />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { format, isToday } from 'date-fns'
import DailyColumn from './DailyColumn.vue'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  currentDate: { type: Date, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['click-slot', 'click-entry', 'resize-entry', 'drop-entry'])

const calendarBody = ref(null)

const hours = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 - 22:00

const dayInfo = computed(() => {
  const date = props.currentDate
  return {
    dateStr: format(date, 'yyyy-MM-dd'),
    dayName: format(date, 'EEEE'),
    dayNum: format(date, 'd'),
    isToday: isToday(date),
  }
})

const dayEntries = computed(() => {
  const dateStr = dayInfo.value.dateStr
  return props.entries.filter(
    (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr,
  )
})

function formatHour(hour) {
  return `${hour.toString().padStart(2, '0')}:00`
}

onMounted(() => {
  if (calendarBody.value) {
    calendarBody.value.scrollTop = 2 * 60
  }
})
</script>

<style scoped>
.daily-calendar {
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: 60px 1fr;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.header-cell {
  text-align: center;
  padding: 8px 4px;
}

.time-gutter {
  width: 60px;
  min-width: 60px;
}

.day-header.is-today {
  background: rgba(var(--v-theme-primary), 0.08);
}

.calendar-body {
  height: 600px;
  overflow-y: auto;
}

.calendar-grid {
  display: grid;
  grid-template-columns: 60px 1fr;
  position: relative;
}

.hour-label {
  height: 60px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
  padding-top: 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.05);
}
</style>
