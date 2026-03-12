<script setup lang="ts">
import { useAd } from '~/composables/useAd'

const props = defineProps<{ postSlug?: string }>()
const { ad } = useAd('banner')
const el = ref<HTMLElement | null>(null)
const impressed = ref(false)
const observer = ref<IntersectionObserver | null>(null)

const getSessionId = () => sessionStorage.getItem('ko_sid') || ''

onMounted(() => {
  if (!el.value) return
  observer.value = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && !impressed.value && ad.value) {
        impressed.value = true
        $fetch('/api/ads/impression', {
          method: 'POST',
          body: { adId: ad.value.id, postSlug: props.postSlug, sessionId: getSessionId() }
        }).catch(() => {})
        observer.value?.disconnect()
      }
    },
    { threshold: 0.3 }
  )
  observer.value.observe(el.value)
})

onUnmounted(() => {
  observer.value?.disconnect()
})

async function handleClick() {
  if (!ad.value) return
  await $fetch('/api/ads/click', {
    method: 'POST',
    body: { adId: ad.value.id, postSlug: props.postSlug, sessionId: getSessionId() }
  }).catch(() => {})
  window.open(ad.value.link_url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div v-if="ad" ref="el" class="my-6 rounded-xl border border-default overflow-hidden">
    <button
      class="w-full flex items-center gap-4 p-4 hover:bg-elevated/50 transition-colors text-left"
      @click="handleClick"
    >
      <img
        v-if="ad.image_url"
        :src="ad.image_url"
        :alt="ad.name"
        class="h-16 w-auto rounded-lg object-contain shrink-0"
      />
      <div class="flex-1 min-w-0">
        <span class="text-xs text-muted uppercase tracking-wide font-medium">Sponsored</span>
        <p class="font-semibold text-sm mt-0.5">{{ ad.name }}</p>
        <p v-if="ad.description" class="text-xs text-muted mt-0.5 line-clamp-1">{{ ad.description }}</p>
      </div>
      <UButton size="sm" variant="outline" :label="ad.cta_text || 'Learn More'" class="shrink-0" />
    </button>
    <div class="px-4 pb-2">
      <AdDisclosure />
    </div>
  </div>
</template>
