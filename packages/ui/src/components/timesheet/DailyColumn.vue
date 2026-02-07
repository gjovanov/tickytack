<template>
  <div
    class="daily-column"
    :class="{ 'is-today': isToday, 'drag-over': isDragOver }"
    @click="handleColumnClick"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Hour slots (background grid) -->
    <div
      v-for="hour in hours"
      :key="hour"
      class="hour-slot"
      @click.stop="$emit('click-slot', hour)"
    />

    <!-- Time entry cards -->
    <TimeEntryCard
      v-for="entry in entries"
      :key="entry._id"
      :entry="entry"
      :style="getEntryPosition(entry)"
      @click.stop="$emit('click-entry', entry)"
      @resize="$emit('resize-entry', $event)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TimeEntryCard from './TimeEntryCard.vue'

const props = defineProps({
  date: { type: String, required: true },
  entries: { type: Array, default: () => [] },
  isToday: { type: Boolean, default: false },
})

const emit = defineEmits(['click-slot', 'click-entry', 'resize-entry', 'drop-entry'])

const hours = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00 - 22:00
const isDragOver = ref(false)

function getEntryPosition(entry) {
  const [startH, startM] = entry.startTime.split(':').map(Number)
  const topOffset = (startH - 6) * 60 + startM // offset from 06:00
  return {
    top: `${topOffset}px`,
  }
}

function handleColumnClick(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const y = event.clientY - rect.top
  const hour = Math.floor(y / 60) + 6
}

function handleDragOver(e) {
  e.dataTransfer.dropEffect = 'move'
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e) {
  isDragOver.value = false
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'))
    // Calculate the hour from drop position, using card top (not mouse pointer)
    const rect = e.currentTarget.getBoundingClientRect()
    const grabOffset = data.grabOffsetY || 0
    const y = e.clientY - rect.top - grabOffset
    const rawMinutes = Math.max(Math.floor(y), 0)
    // Snap to 15-minute increments from 06:00
    const snappedMinutes = Math.round(rawMinutes / 15) * 15
    const dropHour = Math.floor(snappedMinutes / 60) + 6
    const dropMinute = snappedMinutes % 60
    const newStartTime = `${dropHour.toString().padStart(2, '0')}:${dropMinute.toString().padStart(2, '0')}`

    // Calculate new end time preserving duration
    const totalEnd = dropHour * 60 + dropMinute + data.durationMinutes
    const endH = Math.min(Math.floor(totalEnd / 60), 23)
    const endM = totalEnd % 60
    const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

    emit('drop-entry', {
      entryId: data.entryId,
      date: props.date,
      startTime: newStartTime,
      endTime: newEndTime,
    })
  } catch {
    // ignore invalid drag data
  }
}
</script>

<style scoped>
.daily-column {
  position: relative;
  border-left: 1px solid rgba(var(--v-border-color), 0.1);
  min-height: calc(17 * 60px);
}

.daily-column.is-today {
  background: rgba(var(--v-theme-primary), 0.04);
}

.daily-column.drag-over {
  background: rgba(var(--v-theme-primary), 0.08);
}

.hour-slot {
  height: 60px;
  border-top: 1px solid rgba(var(--v-border-color), 0.05);
  cursor: pointer;
}

.hour-slot:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
