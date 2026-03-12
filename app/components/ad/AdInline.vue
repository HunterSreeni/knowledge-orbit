<script setup lang="ts">
import { useAd } from '~/composables/useAd'

const props = defineProps<{ postSlug?: string }>()
const { ad } = useAd('inline')
const el = ref<HTMLElement | null>(null)
const impressed = ref(false)
const observer = ref<IntersectionObserver | null>(null)

const getSessionId = () => {
  const key = 'ko_sid'
  return sessionStorage.getItem(key) || ''
}

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
    { threshold: 0.5 }
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
  <div v-if="ad" ref="el" class="my-8 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
    <div class="flex items-start gap-3">
      <img
        v-if="ad.image_url"
        :src="ad.image_url"
        :alt="ad.name"
        class="w-16 h-16 rounded-lg object-cover shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-muted/20 text-muted uppercase tracking-wide">
            Sponsored
          </span>
        </div>
        <p class="font-medium text-sm leading-snug mb-1">{{ ad.name }}</p>
        <p v-if="ad.description" class="text-xs text-muted leading-relaxed mb-2">{{ ad.description }}</p>
        <button
          class="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
          @click="handleClick"
        >
          {{ ad.cta_text || 'Learn More' }} →
        </button>
      </div>
    </div>
    <AdDisclosure class="mt-2" />
  </div>
</template>
