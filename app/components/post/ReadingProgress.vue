<script setup lang="ts">
const progress = ref(0)

function update() {
  const el = document.getElementById('post-content')
  if (!el) return
  const { top, height } = el.getBoundingClientRect()
  const scrolled = Math.max(0, -top)
  const total = height - window.innerHeight
  progress.value = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0
}

onMounted(() => window.addEventListener('scroll', update, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', update))
</script>

<template>
  <div
    class="fixed top-0 left-0 h-[3px] bg-sky-500 z-50 transition-[width] duration-100"
    :style="{ width: `${progress}%` }"
  />
</template>
