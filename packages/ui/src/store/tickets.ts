import { defineStore } from 'pinia'
import httpClient from '@/services/http-client'
import { useAppStore } from './app'

interface TicketData {
  _id: string
  key: string
  summary: string
  description?: string
  projectId: { _id: string; name: string; key: string; color: string }
  orgId: string
  assigneeId?: { _id: string; firstName: string; lastName: string }
  reporterId: { _id: string; firstName: string; lastName: string }
  status: string
  priority: string
  estimatedHours?: number
  sequenceNumber: number
}

interface TicketsState {
  tickets: TicketData[]
  searchResults: TicketData[]
  loading: boolean
  selectedProjectId: string | null
  selectedProjectIds: string[]
}

export const useTicketsStore = defineStore('tickets', {
  state: (): TicketsState => ({
    tickets: [],
    searchResults: [],
    loading: false,
    selectedProjectId: null,
    selectedProjectIds: [],
  }),
  actions: {
    async fetchTickets(projectId: string) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      this.loading = true
      try {
        const { data } = await httpClient.get(
          `/org/${appStore.currentOrg.id}/project/${projectId}/ticket`,
        )
        this.tickets = data
        this.selectedProjectId = projectId
      } finally {
        this.loading = false
      }
    },
    async fetchTicketsForProjects(projectIds: string[]) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      this.loading = true
      this.selectedProjectIds = projectIds
      try {
        if (projectIds.length === 0) {
          this.tickets = []
          return
        }
        const results = await Promise.all(
          projectIds.map((pid) =>
            httpClient.get(`/org/${appStore.currentOrg!.id}/project/${pid}/ticket`),
          ),
        )
        this.tickets = results.flatMap((r) => r.data)
      } finally {
        this.loading = false
      }
    },
    async searchTickets(query: string) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      const { data } = await httpClient.get(
        `/org/${appStore.currentOrg.id}/ticket/search`,
        { params: { q: query } },
      )
      this.searchResults = data
      return data
    },
    async createTicket(
      projectId: string,
      payload: {
        summary: string
        description?: string
        assigneeId?: string
        status?: string
        priority?: string
        estimatedHours?: number
      },
    ) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.post(
        `/org/${appStore.currentOrg.id}/project/${projectId}/ticket`,
        payload,
      )
      await this.fetchTickets(projectId)
    },
    async updateTicket(
      projectId: string,
      ticketId: string,
      payload: Partial<{
        summary: string
        description: string
        assigneeId: string
        status: string
        priority: string
        estimatedHours: number
      }>,
    ) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.put(
        `/org/${appStore.currentOrg.id}/project/${projectId}/ticket/${ticketId}`,
        payload,
      )
      await this.fetchTickets(projectId)
    },
    async deleteTicket(projectId: string, ticketId: string) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.delete(
        `/org/${appStore.currentOrg.id}/project/${projectId}/ticket/${ticketId}`,
      )
      await this.fetchTickets(projectId)
    },
  },
})
