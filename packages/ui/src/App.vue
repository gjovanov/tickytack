<template>
  <router-view v-if="ready" />
</template>

<script setup>
import { onBeforeMount, ref } from 'vue'
import { useAppStore } from '@/store/app'

const appStore = useAppStore()
const ready = ref(false)

onBeforeMount(async () => {
  if (appStore.auth.token) {
    await appStore.fetchMe()
  }
  ready.value = true
})
</script>
