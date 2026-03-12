<script setup lang="ts">
import { useAd } from '~/composables/useAd'

const props = defineProps<{ postSlug?: string }>()
const { ad } = useAd('end_of_post')
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
  <div v-if="ad" ref="el" class="mt-12 rounded-2xl border border-default overflow-hidden bg-elevated/30">
    <div class="flex flex-col sm:flex-row gap-0">
      <div
        v-if="ad.image_url"
        class="sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden"
      >
        <img :src="ad.image_url" :alt="ad.name" class="w-full h-full object-cover" />
      </div>
      <div class="p-6 flex flex-col justify-center gap-3">
        <span class="text-xs text-muted uppercase tracking-wide font-medium">Sponsored</span>
        <h3 class="font-bold text-lg leading-snug">{{ ad.name }}</h3>
        <p v-if="ad.description" class="text-sm text-muted leading-relaxed">{{ ad.description }}</p>
        <div class="flex items-center gap-3 mt-1">
          <UButton
            :label="ad.cta_text || 'Learn More'"
            trailing-icon="i-lucide-arrow-right"
            rel="nofollow sponsored"
            @click="handleClick"
          />
        </div>
        <AdDisclosure />
      </div>
    </div>
  </div>
</template>
