<template>
  <v-container fluid class="pa-4">
    <CalendarToolbar
      :current-date="timesheetStore.currentDate"
      :view-mode="timesheetStore.viewMode"
      @previous="timesheetStore.goToPrevious()"
      @next="timesheetStore.goToNext()"
      @today="timesheetStore.goToToday()"
      @view-mode="timesheetStore.setViewMode($event)"
    />

    <v-row class="mt-2">
      <v-col cols="12" md="9">
        <DailyCalendar
          v-if="timesheetStore.viewMode === 'daily'"
          :entries="timesheetStore.entries"
          :current-date="timesheetStore.currentDate"
          :loading="timesheetStore.loading"
          @click-slot="openCreateDialog"
          @drag-select="openCreateDialogWithRange"
          @click-entry="openEditDialog"
          @resize-entry="handleResize"
          @drop-entry="handleDrop"
        />
        <WeeklyCalendar
          v-else-if="timesheetStore.viewMode === 'weekly'"
          :entries="timesheetStore.entries"
          :week-start="timesheetStore.weekStart"
          :loading="timesheetStore.loading"
          @click-slot="openCreateDialog"
          @drag-select="openCreateDialogWithRange"
          @click-entry="openEditDialog"
          @resize-entry="handleResize"
          @drop-entry="handleDrop"
        />
        <MonthlyCalendar
          v-else
          :entries="timesheetStore.entries"
          :current-date="timesheetStore.currentDate"
          :loading="timesheetStore.loading"
          @click-day="handleMonthDayClick"
        />
        <TimesheetSummary
          v-if="timesheetStore.viewMode === 'weekly'"
          :entries="timesheetStore.entries"
          :week-start="timesheetStore.weekStart"
        />
      </v-col>
      <v-col cols="12" md="3">
        <RecentTickets
          :tickets="timesheetStore.recentTickets"
          @select="handleRecentTicketSelect"
        />
      </v-col>
    </v-row>

    <TimeEntryDialog
      v-model="dialogOpen"
      :entry="selectedEntry"
      :prefilled-date="prefilledDate"
      :prefilled-hour="prefilledHour"
      :prefilled-ticket-id="prefilledTicketId"
      :prefilled-start-time="prefilledStartTime"
      :prefilled-end-time="prefilledEndTime"
      @save="handleSave"
      @delete="handleDelete"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTimesheetStore } from '@/store/timesheet'
import { useSnackbar } from '@/composables/useSnackbar'
import CalendarToolbar from '@/components/timesheet/CalendarToolbar.vue'
import DailyCalendar from '@/components/timesheet/DailyCalendar.vue'
import WeeklyCalendar from '@/components/timesheet/WeeklyCalendar.vue'
import MonthlyCalendar from '@/components/timesheet/MonthlyCalendar.vue'
import TimesheetSummary from '@/components/timesheet/TimesheetSummary.vue'
import RecentTickets from '@/components/timesheet/RecentTickets.vue'
import TimeEntryDialog from '@/components/timesheet/TimeEntryDialog.vue'

const timesheetStore = useTimesheetStore()
const { showError } = useSnackbar()

const dialogOpen = ref(false)
const selectedEntry = ref(null)
const prefilledDate = ref(null)
const prefilledHour = ref(null)
const prefilledTicketId = ref(null)
const prefilledStartTime = ref(null)
const prefilledEndTime = ref(null)

onMounted(() => {
  timesheetStore.fetchEntries()
})

function openCreateDialog({ date, hour }) {
  selectedEntry.value = null
  prefilledDate.value = date
  prefilledHour.value = hour
  prefilledTicketId.value = null
  prefilledStartTime.value = null
  prefilledEndTime.value = null
  dialogOpen.value = true
}

function openCreateDialogWithRange({ date, startTime, endTime }) {
  selectedEntry.value = null
  prefilledDate.value = date
  prefilledHour.value = null
  prefilledTicketId.value = null
  prefilledStartTime.value = startTime
  prefilledEndTime.value = endTime
  dialogOpen.value = true
}

function openEditDialog(entry) {
  selectedEntry.value = entry
  prefilledDate.value = null
  prefilledHour.value = null
  prefilledTicketId.value = null
  prefilledStartTime.value = null
  prefilledEndTime.value = null
  dialogOpen.value = true
}

function handleMonthDayClick(dateStr) {
  timesheetStore.currentDate = new Date(dateStr + 'T12:00:00')
  timesheetStore.setViewMode('daily')
}

function handleRecentTicketSelect(ticket) {
  selectedEntry.value = null
  prefilledDate.value = null
  prefilledHour.value = null
  prefilledTicketId.value = ticket._id
  dialogOpen.value = true
}

async function handleResize({ entry, endTime }) {
  try {
    await timesheetStore.updateEntry(entry._id, {
      startTime: entry.startTime,
      endTime,
    })
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Update failed'
    showError(msg)
  }
}

async function handleDrop({ entryId, date, startTime, endTime }) {
  try {
    await timesheetStore.updateEntry(entryId, { date, startTime, endTime })
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Update failed'
    showError(msg)
  }
}

async function handleSave(data) {
  try {
    if (data._id) {
      await timesheetStore.updateEntry(data._id, data)
    } else {
      await timesheetStore.createEntry(data)
    }
    dialogOpen.value = false
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Operation failed'
    showError(msg)
  }
}

async function handleDelete(id) {
  try {
    await timesheetStore.deleteEntry(id)
    dialogOpen.value = false
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Delete failed'
    showError(msg)
  }
}
</script>
