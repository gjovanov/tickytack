<template>
  <v-card variant="outlined">
    <v-card-title class="text-body-1">
      {{ $t('timesheet.recentTickets.title') }}
    </v-card-title>
    <v-list density="compact" v-if="tickets.length">
      <v-list-item
        v-for="ticket in tickets"
        :key="ticket._id"
        @click="$emit('select', ticket)"
        class="cursor-pointer"
      >
        <template #prepend>
          <v-avatar size="8" :color="ticket.projectColor" class="mr-3" />
        </template>
        <v-list-item-title class="text-caption font-weight-medium">
          {{ ticket.key }}
        </v-list-item-title>
        <v-list-item-subtitle class="text-caption">
          {{ ticket.summary }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <v-card-text v-else class="text-body-2 text-medium-emphasis">
      {{ $t('timesheet.recentTickets.noRecent') }}
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  tickets: { type: Array, default: () => [] },
})
defineEmits(['select'])
</script>
