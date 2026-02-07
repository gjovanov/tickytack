<template>
  <div
    class="time-entry-card"
    :class="{ 'is-dragging': isDragging }"
    :style="cardStyle"
    draggable="true"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <div class="card-content">
      <span class="text-caption font-weight-bold text-white">
        {{ entry.ticketId?.key }}
      </span>
      <span class="text-caption text-white d-block text-truncate">
        {{ entry.ticketId?.summary }}
      </span>
      <span class="text-caption text-white opacity-80">
        {{ entry.startTime }} - {{ displayEndTime }}
      </span>
    </div>
    <!-- Resize handle -->
    <div class="resize-handle" @mousedown.stop.prevent="startResize" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  entry: { type: Object, required: true },
})

const emit = defineEmits(['click', 'resize', 'drag-start'])

const resizeDeltaY = ref(0)
const isResizing = ref(false)
const isDragging = ref(false)
const recentlyResized = ref(false)
const recentlyDragged = ref(false)

const bgColor = computed(
  () => props.entry.projectId?.color || '#1976D2',
)

const baseHeight = computed(() =>
  Math.max(props.entry.durationMinutes, 20),
)

const displayEndTime = computed(() => {
  if (!isResizing.value || resizeDeltaY.value === 0) return props.entry.endTime
  const snapped = snapTo15(calcNewDuration())
  const [sh, sm] = props.entry.startTime.split(':').map(Number)
  const totalMin = sh * 60 + sm + snapped
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

const cardStyle = computed(() => ({
  backgroundColor: bgColor.value,
  height: isResizing.value
    ? `${snapTo15(calcNewDuration())}px`
    : `${baseHeight.value}px`,
}))

function snapTo15(minutes) {
  return Math.max(Math.round(minutes / 15) * 15, 15)
}

function calcNewDuration() {
  return Math.max(props.entry.durationMinutes + resizeDeltaY.value, 15)
}

function handleClick(e) {
  if (!isResizing.value && !isDragging.value && !recentlyResized.value && !recentlyDragged.value) {
    emit('click', e)
  }
}

// --- Drag & Drop ---
function handleDragStart(e) {
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  const cardRect = e.currentTarget.getBoundingClientRect()
  const grabOffsetY = e.clientY - cardRect.top
  e.dataTransfer.setData('application/json', JSON.stringify({
    entryId: props.entry._id,
    startTime: props.entry.startTime,
    endTime: props.entry.endTime,
    durationMinutes: props.entry.durationMinutes,
    date: props.entry.date,
    grabOffsetY,
  }))
  emit('drag-start', props.entry)
}

function handleDragEnd() {
  isDragging.value = false
  recentlyDragged.value = true
  setTimeout(() => { recentlyDragged.value = false }, 300)
}

// --- Resize ---
let startY = 0

function startResize(e) {
  startY = e.clientY
  isResizing.value = true
  resizeDeltaY.value = 0

  const onMouseMove = (ev) => {
    resizeDeltaY.value = ev.clientY - startY
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)

    if (Math.abs(resizeDeltaY.value) > 5) {
      const snapped = snapTo15(calcNewDuration())
      const [sh, sm] = props.entry.startTime.split(':').map(Number)
      const totalMin = sh * 60 + sm + snapped
      const endH = Math.min(Math.floor(totalMin / 60), 23)
      const endM = totalMin % 60
      const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

      emit('resize', {
        entry: props.entry,
        endTime: newEndTime,
        durationMinutes: snapped,
      })
    }

    isResizing.value = false
    resizeDeltaY.value = 0
    recentlyResized.value = true
    setTimeout(() => { recentlyResized.value = false }, 300)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.time-entry-card {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  cursor: grab;
  overflow: hidden;
  z-index: 1;
  transition: box-shadow 0.15s;
  min-height: 20px;
}

.time-entry-card:active {
  cursor: grabbing;
}

.time-entry-card.is-dragging {
  opacity: 0.5;
}

.time-entry-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.card-content {
  padding: 2px 6px;
  line-height: 1.3;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  background: rgba(255, 255, 255, 0.2);
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
