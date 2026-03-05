<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Analytics — Knowledge Orbit' })
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-6">Analytics</h1>
    <UAlert
      title="Phase 3 feature"
      description="Analytics dashboard will be available after Phase 3 is implemented."
      color="info"
      variant="soft"
      icon="i-lucide-info"
    />
  </div>
</template>
