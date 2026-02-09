export const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        redirect: '/timesheet',
      },
      {
        path: 'auth',
        name: 'auth',
        children: [
          {
            path: 'login',
            name: 'auth.login',
            component: () => import('@/views/auth/LoginView.vue'),
            meta: { public: true },
          },
          {
            path: 'register',
            name: 'auth.register',
            component: () => import('@/views/auth/RegisterView.vue'),
            meta: { public: true },
          },
          {
            path: 'oauth-callback',
            name: 'auth.oauth-callback',
            component: () => import('@/views/auth/OAuthCallbackView.vue'),
            meta: { public: true },
          },
        ],
      },
      {
        path: 'timesheet',
        name: 'timesheet',
        component: () => import('@/views/timesheet/TimesheetView.vue'),
      },
      {
        path: 'admin',
        name: 'admin',
        children: [
          {
            path: '',
            name: 'admin.root',
            redirect: '/admin/projects',
          },
          {
            path: 'orgs',
            name: 'admin.orgs',
            component: () => import('@/views/admin/OrgView.vue'),
          },
          {
            path: 'projects',
            name: 'admin.projects',
            component: () => import('@/views/admin/ProjectsView.vue'),
          },
          {
            path: 'tickets',
            name: 'admin.tickets',
            component: () => import('@/views/admin/TicketsView.vue'),
          },
          {
            path: 'users',
            name: 'admin.users',
            component: () => import('@/views/admin/UsersView.vue'),
          },
        ],
      },
      {
        path: 'export',
        name: 'export',
        component: () => import('@/views/export/ExportView.vue'),
      },
    ],
  },
]
