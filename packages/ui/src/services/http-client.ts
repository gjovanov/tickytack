import axios from 'axios'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const httpClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ttt_token')
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ttt_token')
      localStorage.removeItem('ttt_user')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  },
)

export default httpClient
