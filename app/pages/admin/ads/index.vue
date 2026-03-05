<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Ads Manager — Knowledge Orbit' })
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Ads Manager</h1>
      <UButton to="/admin/ads/new" icon="i-lucide-plus" label="New Ad" />
    </div>
    <UAlert
      title="Phase 2 feature"
      description="Ad management will be available after Phase 2 is implemented."
      color="info"
      variant="soft"
      icon="i-lucide-info"
    />
  </div>
</template>
