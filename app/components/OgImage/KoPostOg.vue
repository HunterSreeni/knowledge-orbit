<script setup lang="ts">
defineProps<{
  title: string
  author?: string
  tags?: string[]
}>()
</script>

<template>
  <div class="w-full h-full bg-gray-900 flex flex-col p-12">
    <div class="text-blue-400 text-2xl font-bold mb-4">Knowledge Orbit</div>
    <div class="text-white text-5xl font-bold leading-tight flex-1">{{ title }}</div>
    <div class="flex items-center gap-4 mt-auto">
      <span v-if="author" class="text-gray-400 text-xl">{{ author }}</span>
      <div class="flex gap-2">
        <span
          v-for="tag in tags?.slice(0, 3)"
          :key="tag"
          class="bg-blue-900 text-blue-300 px-3 py-1 rounded text-sm"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
