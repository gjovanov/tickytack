import { defineStore } from 'pinia'
import httpClient from '@/services/http-client'
import { useAppStore } from './app'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
} from 'date-fns'

interface TimeEntryData {
  _id: string
  orgId: string
  userId: string
  ticketId: {
    _id: string
    key: string
    summary: string
  }
  projectId: {
    _id: string
    name: string
    key: string
    color: string
  }
  date: string
  startTime: string
  endTime: string
  durationMinutes: number
  description?: string
}

interface RecentTicket {
  _id: string
  key: string
  summary: string
  projectKey: string
  projectColor: string
}

type ViewMode = 'daily' | 'weekly' | 'monthly'

interface TimesheetState {
  currentDate: Date
  viewMode: ViewMode
  entries: TimeEntryData[]
  recentTickets: RecentTicket[]
  loading: boolean
}

export const useTimesheetStore = defineStore('timesheet', {
  state: (): TimesheetState => ({
    currentDate: new Date(),
    viewMode: 'weekly',
    entries: [],
    recentTickets: [],
    loading: false,
  }),
  actions: {
    async fetchEntries() {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      this.loading = true
      try {
        let start: Date
        let end: Date
        if (this.viewMode === 'daily') {
          start = this.currentDate
          end = this.currentDate
        } else if (this.viewMode === 'monthly') {
          start = startOfMonth(this.currentDate)
          end = endOfMonth(this.currentDate)
        } else {
          start = startOfWeek(this.currentDate, { weekStartsOn: 1 })
          end = endOfWeek(this.currentDate, { weekStartsOn: 1 })
        }

        const { data } = await httpClient.get(
          `/org/${appStore.currentOrg.id}/timeentry`,
          {
            params: {
              startDate: format(start, 'yyyy-MM-dd'),
              endDate: format(end, 'yyyy-MM-dd'),
            },
          },
        )
        this.entries = data

        // Build recent tickets from entries
        const ticketMap = new Map<string, RecentTicket>()
        for (const entry of data) {
          if (entry.ticketId && !ticketMap.has(entry.ticketId._id)) {
            ticketMap.set(entry.ticketId._id, {
              _id: entry.ticketId._id,
              key: entry.ticketId.key,
              summary: entry.ticketId.summary,
              projectKey: entry.projectId?.key || '',
              projectColor: entry.projectId?.color || '#1976D2',
            })
          }
        }
        this.recentTickets = Array.from(ticketMap.values()).slice(0, 10)
      } finally {
        this.loading = false
      }
    },
    async createEntry(payload: {
      ticketId: string
      date: string
      startTime: string
      endTime: string
      description?: string
    }) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.post(
        `/org/${appStore.currentOrg.id}/timeentry`,
        payload,
      )
      await this.fetchEntries()
    },
    async updateEntry(
      id: string,
      payload: {
        ticketId?: string
        date?: string
        startTime?: string
        endTime?: string
        description?: string
      },
    ) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.put(
        `/org/${appStore.currentOrg.id}/timeentry/${id}`,
        payload,
      )
      await this.fetchEntries()
    },
    async deleteEntry(id: string) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.delete(
        `/org/${appStore.currentOrg.id}/timeentry/${id}`,
      )
      await this.fetchEntries()
    },
    goToNext() {
      if (this.viewMode === 'daily') {
        this.currentDate = addDays(this.currentDate, 1)
      } else if (this.viewMode === 'monthly') {
        this.currentDate = addMonths(this.currentDate, 1)
      } else {
        this.currentDate = addWeeks(this.currentDate, 1)
      }
      this.fetchEntries()
    },
    goToPrevious() {
      if (this.viewMode === 'daily') {
        this.currentDate = subDays(this.currentDate, 1)
      } else if (this.viewMode === 'monthly') {
        this.currentDate = subMonths(this.currentDate, 1)
      } else {
        this.currentDate = subWeeks(this.currentDate, 1)
      }
      this.fetchEntries()
    },
    goToToday() {
      this.currentDate = new Date()
      this.fetchEntries()
    },
    setViewMode(mode: ViewMode) {
      this.viewMode = mode
      this.fetchEntries()
    },
  },
  getters: {
    weekStart: (state) =>
      startOfWeek(state.currentDate, { weekStartsOn: 1 }),
    weekEnd: (state) =>
      endOfWeek(state.currentDate, { weekStartsOn: 1 }),
    monthStart: (state) =>
      startOfMonth(state.currentDate),
    monthEnd: (state) =>
      endOfMonth(state.currentDate),
  },
})
