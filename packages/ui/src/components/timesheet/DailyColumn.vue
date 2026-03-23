<template>
  <div
    class="daily-column"
    :class="{ 'is-today': isToday, 'drag-over': isDragOver }"
    @mousedown="handleMouseDown"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Hour slots (background grid) -->
    <div
      v-for="hour in hours"
      :key="hour"
      class="hour-slot"
    />

    <!-- Drag selection preview -->
    <div
      v-if="isDragSelecting"
      class="drag-preview"
      :style="dragPreviewStyle"
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
import { ref, computed, onBeforeUnmount } from 'vue'
import TimeEntryCard from './TimeEntryCard.vue'

const DISPLAY_START = 6
const DISPLAY_END = 22
const DISPLAY_HOURS = DISPLAY_END - DISPLAY_START // 16 visible hours
const MAX_MINUTES = 24 * 60 // Full 24h for entry placement
const DRAG_THRESHOLD = 5 // px
const PX_PER_MINUTE = 0.5
const HOUR_HEIGHT = 30 // px per hour slot

const props = defineProps({
  date: { type: String, required: true },
  entries: { type: Array, default: () => [] },
  isToday: { type: Boolean, default: false },
})

const emit = defineEmits(['click-slot', 'click-entry', 'resize-entry', 'drop-entry', 'drag-select'])

const hours = Array.from({ length: DISPLAY_HOURS + 1 }, (_, i) => i + DISPLAY_START)
const isDragOver = ref(false)

// Drag-select state
const isDragSelecting = ref(false)
const dragStartY = ref(0)
const dragCurrentY = ref(0)
const dragStartMinutes = ref(0)
const dragCurrentMinutes = ref(0)
let columnRect = null

function snapMinutes(minutes) {
  // Clamp to visible display range for drag interactions
  const displayMax = DISPLAY_HOURS * 60
  return Math.min(Math.max(Math.round(minutes / 15) * 15, 0), displayMax)
}

function minutesToTime(minutes) {
  const totalMinutes = minutes + DISPLAY_START * 60
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function yToMinutes(y) {
  return snapMinutes(Math.floor(y / PX_PER_MINUTE))
}

const dragPreviewStyle = computed(() => {
  const minMin = Math.min(dragStartMinutes.value, dragCurrentMinutes.value)
  const maxMin = Math.max(dragStartMinutes.value, dragCurrentMinutes.value)
  return {
    top: `${minMin * PX_PER_MINUTE}px`,
    height: `${Math.max((maxMin - minMin) * PX_PER_MINUTE, 8)}px`,
  }
})

function handleMouseDown(event) {
  // Ignore if clicking on a TimeEntryCard
  if (event.target.closest('.time-entry-card')) return
  // Only respond to left mouse button
  if (event.button !== 0) return

  const rect = event.currentTarget.getBoundingClientRect()
  columnRect = rect
  const y = event.clientY - rect.top

  dragStartY.value = event.clientY
  dragCurrentY.value = event.clientY
  dragStartMinutes.value = yToMinutes(y)
  dragCurrentMinutes.value = dragStartMinutes.value

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(event) {
  const dy = Math.abs(event.clientY - dragStartY.value)
  if (!isDragSelecting.value && dy >= DRAG_THRESHOLD) {
    isDragSelecting.value = true
  }

  if (isDragSelecting.value && columnRect) {
    dragCurrentY.value = event.clientY
    const y = event.clientY - columnRect.top
    dragCurrentMinutes.value = yToMinutes(y)
  }
}

function handleMouseUp(event) {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  const dy = Math.abs(event.clientY - dragStartY.value)

  if (dy < DRAG_THRESHOLD) {
    // Treat as click — emit click-slot with the hour
    const hour = Math.floor(dragStartMinutes.value / 60) + DISPLAY_START
    emit('click-slot', hour)
  } else {
    // Drag completed — compute start/end, swap if needed
    let startMin = dragStartMinutes.value
    let endMin = dragCurrentMinutes.value
    if (startMin > endMin) {
      ;[startMin, endMin] = [endMin, startMin]
    }
    // Ensure minimum 15-min selection
    if (endMin - startMin < 15) {
      endMin = startMin + 15
    }
    emit('drag-select', {
      startTime: minutesToTime(startMin),
      endTime: minutesToTime(endMin),
    })
  }

  isDragSelecting.value = false
  columnRect = null
}

// Cleanup listeners on unmount
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

function getEntryPosition(entry) {
  const [startH, startM] = entry.startTime.split(':').map(Number)
  const topOffset = ((startH - DISPLAY_START) * 60 + startM) * PX_PER_MINUTE
  return {
    top: `${topOffset}px`,
  }
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
    const rect = e.currentTarget.getBoundingClientRect()
    const grabOffset = data.grabOffsetY || 0
    const y = e.clientY - rect.top - grabOffset
    const rawMinutes = Math.max(Math.floor(y / PX_PER_MINUTE), 0)
    const snappedMinutes = Math.round(rawMinutes / 15) * 15
    const dropHour = Math.floor(snappedMinutes / 60) + DISPLAY_START
    const dropMinute = snappedMinutes % 60
    const newStartTime = `${dropHour.toString().padStart(2, '0')}:${dropMinute.toString().padStart(2, '0')}`

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
  min-height: calc(17 * 30px); /* 16 display hours + 1 */
  user-select: none;
}

.daily-column.is-today {
  background: rgba(var(--v-theme-primary), 0.04);
}

.daily-column.drag-over {
  background: rgba(var(--v-theme-primary), 0.08);
}

.hour-slot {
  height: 30px;
  border-top: 1px solid rgba(var(--v-border-color), 0.05);
  cursor: pointer;
}

.hour-slot:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.drag-preview {
  position: absolute;
  left: 4px;
  right: 4px;
  background: rgba(var(--v-theme-primary), 0.2);
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  pointer-events: none;
  z-index: 5;
}
</style>
