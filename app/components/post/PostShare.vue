<script setup lang="ts">
const props = defineProps<{
  title: string
  url: string
}>()

const copied = ref(false)

const shareLinks = computed(() => [
  {
    label: 'Twitter',
    icon: 'i-simple-icons-x',
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(props.title)}&url=${encodeURIComponent(props.url)}`
  },
  {
    label: 'LinkedIn',
    icon: 'i-simple-icons-linkedin',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.url)}`
  },
  {
    label: 'WhatsApp',
    icon: 'i-simple-icons-whatsapp',
    href: `https://wa.me/?text=${encodeURIComponent(props.title + ' ' + props.url)}`
  }
])

async function copyLink() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(props.url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-muted mr-1">Share</span>
    <a
      v-for="link in shareLinks"
      :key="link.label"
      :href="link.href"
      target="_blank"
      rel="noopener nofollow"
      :title="link.label"
      class="size-8 rounded-full border border-default flex items-center justify-center text-muted hover:text-sky-500 hover:border-sky-500/40 transition-colors"
    >
      <UIcon :name="link.icon" class="size-3.5" />
    </a>
    <button
      :title="copied ? 'Copied!' : 'Copy link'"
      class="size-8 rounded-full border border-default flex items-center justify-center text-muted hover:text-sky-500 hover:border-sky-500/40 transition-colors"
      @click="copyLink"
    >
      <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-link'" class="size-3.5" />
    </button>
  </div>
</template>
