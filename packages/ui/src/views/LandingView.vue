<template>
  <v-app theme="light">
  <div class="landing-page">
    <!-- Navbar -->
    <v-app-bar flat color="transparent" class="landing-nav">
      <v-toolbar-title class="font-weight-bold text-h5">
        <span class="text-primary">TickyTack</span>
      </v-toolbar-title>
      <v-spacer />
      <v-btn variant="text" href="#features">Features</v-btn>
      <v-btn variant="text" href="#pricing">Pricing</v-btn>
      <v-btn variant="outlined" color="primary" :to="{ name: 'auth.login' }" class="mx-2">Log In</v-btn>
      <v-btn color="primary" :to="{ name: 'auth.register' }">Get Started Free</v-btn>
    </v-app-bar>

    <!-- Hero -->
    <section class="hero-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h1 class="text-h2 font-weight-bold mb-4">Track time. Ship projects.<br/><span class="text-primary">Get paid.</span></h1>
            <p class="text-h6 landing-muted mb-8">Drag-and-drop time tracking, project management, and smart exports — built for freelancers and teams who bill by the hour.</p>
            <v-btn color="primary" size="x-large" :to="{ name: 'auth.register' }" class="mr-4 px-8">Start Free</v-btn>
            <v-btn variant="outlined" size="x-large" href="#pricing" class="px-8">View Plans</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Trust bar -->
    <section class="trust-section py-8">
      <v-container>
        <p class="text-center text-body-2 landing-muted mb-4">Trusted by freelancers and teams worldwide</p>
        <v-row justify="center" align="center">
          <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="3" class="text-center">
            <div class="text-h4 font-weight-bold text-primary">{{ stat.value }}</div>
            <div class="text-body-2 landing-muted">{{ stat.label }}</div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Features -->
    <section id="features" class="features-section py-16">
      <v-container>
        <h2 class="text-h3 text-center font-weight-bold mb-2">Everything you need to stay on track</h2>
        <p class="text-center text-body-1 landing-muted mb-12">From time entries to exports, all in one place</p>
        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="6" md="4">
            <v-card variant="outlined" class="feature-card pa-6 h-100" rounded="lg">
              <v-icon :color="feature.color" size="48" class="mb-4">{{ feature.icon }}</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">{{ feature.title }}</h3>
              <p class="text-body-2 landing-muted">{{ feature.description }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="pricing-section py-16">
      <v-container>
        <h2 class="text-h3 text-center font-weight-bold mb-2">Simple, transparent pricing</h2>
        <p class="text-center text-body-1 landing-muted mb-12">Start free, scale as you grow</p>
        <v-row justify="center">
          <v-col v-for="plan in plans" :key="plan.name" cols="12" sm="6" md="4">
            <v-card
              :variant="plan.popular ? 'elevated' : 'outlined'"
              :elevation="plan.popular ? 8 : 0"
              class="pa-6 h-100 d-flex flex-column"
              rounded="lg"
              :class="{ 'border-primary': plan.popular }"
            >
              <v-chip v-if="plan.popular" color="primary" size="small" class="mb-4 align-self-start">Most Popular</v-chip>
              <h3 class="text-h5 font-weight-bold">{{ plan.name }}</h3>
              <div class="my-4">
                <span class="text-h3 font-weight-bold">${{ plan.price }}</span>
                <span v-if="plan.price > 0" class="text-body-2 landing-muted">/user/mo</span>
                <span v-else class="text-body-2 landing-muted">forever</span>
              </div>
              <v-divider class="mb-4" />
              <v-list density="compact" class="flex-grow-1 bg-transparent">
                <v-list-item v-for="f in plan.features" :key="f" :title="f" prepend-icon="mdi-check" />
              </v-list>
              <v-btn
                :color="plan.popular ? 'primary' : undefined"
                :variant="plan.popular ? 'flat' : 'outlined'"
                block
                size="large"
                :to="{ name: 'auth.register' }"
                class="mt-4"
              >
                {{ plan.price === 0 ? 'Get Started Free' : 'Start Free Trial' }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Final CTA -->
    <section class="cta-section py-16">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="text-h3 font-weight-bold mb-4 text-white">Ready to take control of your time?</h2>
            <p class="text-body-1 cta-subtitle mb-8">Join thousands of freelancers and teams already tracking smarter with TickyTack.</p>
            <v-btn color="white" size="x-large" :to="{ name: 'auth.register' }" class="px-8 text-primary">Start Tracking — Free</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Footer -->
    <v-footer class="landing-footer py-8">
      <v-container>
        <v-row>
          <v-col cols="12" sm="4">
            <div class="text-h6 font-weight-bold mb-2">TickyTack</div>
            <p class="text-body-2 landing-muted">Time tracking and project management for modern teams.</p>
          </v-col>
          <v-col cols="6" sm="2">
            <div class="text-subtitle-2 font-weight-bold mb-2">Product</div>
            <div class="text-body-2 landing-muted mb-1">Features</div>
            <div class="text-body-2 landing-muted mb-1">Pricing</div>
            <div class="text-body-2 landing-muted mb-1">Security</div>
          </v-col>
          <v-col cols="6" sm="2">
            <div class="text-subtitle-2 font-weight-bold mb-2">Company</div>
            <div class="text-body-2 landing-muted mb-1">About</div>
            <div class="text-body-2 landing-muted mb-1">Blog</div>
            <div class="text-body-2 landing-muted mb-1">Careers</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Legal</div>
            <div class="text-body-2 landing-muted mb-1">Privacy Policy</div>
            <div class="text-body-2 landing-muted mb-1">Terms of Service</div>
          </v-col>
        </v-row>
        <v-divider class="my-4" />
        <div class="text-body-2 landing-muted text-center">&copy; {{ new Date().getFullYear() }} TickyTack. All rights reserved.</div>
      </v-container>
    </v-footer>
  </div>
  </v-app>
</template>

<script setup>
const stats = [
  { value: '50K+', label: 'Hours Tracked' },
  { value: '5K+', label: 'Teams' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Rating' },
]

const features = [
  {
    icon: 'mdi-calendar-week',
    title: 'Weekly Calendar',
    description: 'Drag-and-drop time entries on a weekly calendar with 15-minute snap grid.',
    color: '#F57C00',
  },
  {
    icon: 'mdi-clipboard-check-outline',
    title: 'Projects & Tickets',
    description: 'Auto-generated ticket keys, status workflows, and color-coded projects.',
    color: '#00897B',
  },
  {
    icon: 'mdi-file-excel-outline',
    title: 'Smart Export',
    description: 'Excel reports with =SUM() formulas and PDF generation with editable descriptions.',
    color: '#F57C00',
  },
  {
    icon: 'mdi-account-group-outline',
    title: 'Team Management',
    description: 'Multi-tenant orgs with admin, manager, and member roles.',
    color: '#00897B',
  },
  {
    icon: 'mdi-translate',
    title: 'i18n & Themes',
    description: 'English and German with one-click toggle. Dark and light mode with persistence.',
    color: '#F57C00',
  },
  {
    icon: 'mdi-shield-account-outline',
    title: 'OAuth & Invites',
    description: 'Sign in with Google, GitHub, LinkedIn, Microsoft. Invite teammates via link.',
    color: '#00897B',
  },
]

const plans = [
  {
    name: 'Free',
    price: 0,
    popular: false,
    features: [
      '3 users',
      '2 projects',
      'Basic time tracking',
      'Weekly calendar view',
      'Manual entries',
    ],
  },
  {
    name: 'Pro',
    price: 7,
    popular: true,
    features: [
      'Unlimited users',
      'Unlimited projects',
      'Excel + PDF export',
      'Team reporting',
      'Ticket management',
      'OAuth login',
    ],
  },
  {
    name: 'Business',
    price: 14,
    popular: false,
    features: [
      'Everything in Pro',
      'Advanced analytics',
      'Custom workflows',
      'API access',
      'SSO integration',
      'Priority support',
    ],
  },
]
</script>

<style scoped>
.landing-page {
  background: linear-gradient(180deg, #fffaf5 0%, #ffffff 40%);
  color: #1e1a17;
}

.landing-nav {
  position: fixed !important;
  z-index: 100;
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.92) !important;
  border-bottom: 1px solid rgba(245, 124, 0, 0.1);
  color: #1e1a17 !important;
}

.hero-section {
  padding-top: 140px;
  padding-bottom: 80px;
  background: linear-gradient(135deg, #fff3e0 0%, #fce4ec 50%, #fff8e1 100%);
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 70%, rgba(245, 124, 0, 0.06) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(0, 137, 123, 0.06) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-2%, 2%); }
}

.trust-section {
  background: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.features-section {
  background: #ffffff;
}

.feature-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-color: rgba(0, 0, 0, 0.08) !important;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(245, 124, 0, 0.12) !important;
}

.pricing-section {
  background: linear-gradient(180deg, #f5f5f5 0%, #fafafa 100%);
}

.border-primary {
  border: 2px solid #F57C00 !important;
}

.cta-section {
  background: linear-gradient(135deg, #F57C00 0%, #00897B 100%);
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
}

.cta-subtitle {
  color: rgba(255, 255, 255, 0.85);
}

.landing-footer {
  background: #fafafa !important;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.landing-muted {
  color: rgba(30, 26, 23, 0.7) !important;
}

.landing-page :deep(.v-card) {
  background-color: #ffffff !important;
  color: #1e1a17 !important;
}

.landing-page :deep(.v-list) {
  color: #1e1a17 !important;
}

.landing-page :deep(.v-footer) {
  color: #1e1a17 !important;
}
</style>
