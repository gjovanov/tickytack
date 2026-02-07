import { defineStore } from 'pinia'
import httpClient from '@/services/http-client'
import { useAppStore } from './app'

interface ProjectData {
  _id: string
  name: string
  key: string
  description?: string
  orgId: string
  leadId?: { _id: string; firstName: string; lastName: string }
  color: string
  isActive: boolean
}

interface ProjectsState {
  projects: ProjectData[]
  loading: boolean
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
    loading: false,
  }),
  actions: {
    async fetchProjects() {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      this.loading = true
      try {
        const { data } = await httpClient.get(
          `/org/${appStore.currentOrg.id}/project`,
        )
        this.projects = data
      } finally {
        this.loading = false
      }
    },
    async createProject(payload: {
      name: string
      key: string
      description?: string
      leadId?: string
      color?: string
    }) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.post(
        `/org/${appStore.currentOrg.id}/project`,
        payload,
      )
      await this.fetchProjects()
    },
    async updateProject(
      id: string,
      payload: Partial<{
        name: string
        key: string
        description: string
        leadId: string
        color: string
        isActive: boolean
      }>,
    ) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.put(
        `/org/${appStore.currentOrg.id}/project/${id}`,
        payload,
      )
      await this.fetchProjects()
    },
    async deleteProject(id: string) {
      const appStore = useAppStore()
      if (!appStore.currentOrg) return

      await httpClient.delete(
        `/org/${appStore.currentOrg.id}/project/${id}`,
      )
      await this.fetchProjects()
    },
  },
})
