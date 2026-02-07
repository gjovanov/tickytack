<template>
  <v-app :theme="appStore.theme">
    <v-navigation-drawer
      v-if="appStore.isAuth"
      v-model="appStore.leftDrawer"
      app
    >
      <v-list density="compact" nav>
        <v-list-item
          :title="$t('nav.timesheet')"
          prepend-icon="mdi-calendar-clock"
          :to="{ name: 'timesheet' }"
        />
        <v-divider class="my-2" />
        <v-list-subheader>{{ $t('nav.admin') }}</v-list-subheader>
        <v-list-item
          :title="$t('nav.projects')"
          prepend-icon="mdi-folder-outline"
          :to="{ name: 'admin.projects' }"
        />
        <v-list-item
          :title="$t('nav.tickets')"
          prepend-icon="mdi-ticket-outline"
          :to="{ name: 'admin.tickets' }"
        />
        <v-list-item
          :title="$t('nav.users')"
          prepend-icon="mdi-account-group-outline"
          :to="{ name: 'admin.users' }"
        />
        <v-list-item
          :title="$t('nav.orgs')"
          prepend-icon="mdi-office-building-outline"
          :to="{ name: 'admin.orgs' }"
        />
        <v-divider class="my-2" />
        <v-list-item
          :title="$t('nav.export')"
          prepend-icon="mdi-download-outline"
          :to="{ name: 'export' }"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app density="compact" elevation="1">
      <v-app-bar-nav-icon
        v-if="appStore.isAuth"
        @click="appStore.toggleLeftDrawer()"
      />
      <v-toolbar-title>
        <span class="font-weight-bold">TickyTack</span>
      </v-toolbar-title>

      <v-spacer />

      <!-- Org switcher -->
      <v-chip
        v-if="appStore.currentOrg"
        size="small"
        variant="outlined"
        class="mr-2"
      >
        {{ appStore.currentOrg.name }}
      </v-chip>

      <!-- Language toggle -->
      <v-btn
        icon
        size="small"
        @click="appStore.toggleLocale()"
        :title="appStore.isGerman ? 'English' : 'Deutsch'"
      >
        <span class="text-caption font-weight-bold">
          {{ appStore.isGerman ? 'EN' : 'DE' }}
        </span>
      </v-btn>

      <!-- Theme toggle -->
      <v-btn
        icon
        size="small"
        @click="appStore.toggleTheme()"
      >
        <v-icon>{{ appStore.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <!-- User menu -->
      <v-menu v-if="appStore.isAuth">
        <template #activator="{ props }">
          <v-btn icon v-bind="props" size="small">
            <v-avatar color="primary" size="32">
              <span class="text-caption">{{ appStore.initials }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item :title="appStore.fullName" :subtitle="appStore.auth.user?.email" />
          <v-divider />
          <v-list-item
            :title="$t('common.actions.logout')"
            prepend-icon="mdi-logout"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()
const router = useRouter()

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnackbar(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

provide('showSnackbar', showSnackbar)

function handleLogout() {
  appStore.logout()
  router.push({ name: 'auth.login' })
}
</script>
