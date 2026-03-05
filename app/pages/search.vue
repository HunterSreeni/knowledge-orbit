<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

useSeoMeta({ title: 'Search — Knowledge Orbit' })

const store = usePostsStore()
const route = useRoute()
const router = useRouter()

const query = ref((route.query.q as string) || '')
const results = ref<typeof store.posts>([])
const searched = ref(false)

async function doSearch() {
  if (!query.value.trim()) return
  router.replace({ query: { q: query.value } })
  results.value = await store.searchPosts(query.value.trim())
  searched.value = true
}

onMounted(() => { if (query.value) doSearch() })
</script>

<template>
  <UContainer class="py-8 max-w-3xl">
    <h1 class="text-2xl font-bold mb-6">Search</h1>

    <div class="flex gap-2 mb-8">
      <UInput
        v-model="query"
        placeholder="Search posts…"
        class="flex-1"
        icon="i-lucide-search"
        @keyup.enter="doSearch"
      />
      <UButton label="Search" :loading="store.loading" @click="doSearch" />
    </div>

    <div v-if="store.loading" class="space-y-4">
      <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-xl" />
    </div>

    <div v-else-if="results.length" class="space-y-4">
      <PostCard v-for="post in results" :key="post.id" :post="post" horizontal />
    </div>

    <div v-else-if="searched" class="text-center py-16 text-muted">
      No results for "{{ query }}"
    </div>
  </UContainer>
</template>
