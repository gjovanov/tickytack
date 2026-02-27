export const routes = [
  {
    path: '/landing',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { public: true, guest: true },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/legal/PrivacyPolicyView.vue'),
    meta: { public: true },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/legal/TermsView.vue'),
    meta: { public: true },
  },
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
        path: 'invite/:code',
        name: 'invite',
        component: () => import('@/views/invite/InviteLandingView.vue'),
        meta: { public: true },
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
          {
            path: 'invites',
            name: 'admin.invites',
            component: () => import('@/views/admin/InvitesView.vue'),
          },
          {
            path: 'billing',
            name: 'admin.billing',
            component: () => import('@/views/admin/BillingView.vue'),
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
