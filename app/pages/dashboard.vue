<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Dashboard — Knowledge Orbit' })

const auth = useAuthStore()
const store = usePostsStore()
const myPosts = ref<typeof store.posts>([])
const filter = ref<'all' | 'published' | 'draft'>('all')

onMounted(async () => {
  myPosts.value = await store.fetchMyPosts()
})

const filtered = computed(() => {
  if (filter.value === 'all') return myPosts.value
  return myPosts.value.filter(p => p.status === filter.value)
})

async function toggleStatus(post: (typeof myPosts.value)[0]) {
  if (post.status === 'published') {
    await store.unpublishPost(post.id)
    post.status = 'draft'
  } else {
    await store.publishPost(post.id)
    post.status = 'published'
  }
}

async function remove(id: string) {
  await store.deletePost(id)
  myPosts.value = myPosts.value.filter(p => p.id !== id)
}
</script>

<template>
  <UContainer class="py-8 max-w-4xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">My Posts</h1>
      <UButton to="/write" icon="i-lucide-pen-line" label="New Post" />
    </div>

    <UTabs
      :items="[
        { label: 'All', value: 'all' },
        { label: 'Published', value: 'published' },
        { label: 'Drafts', value: 'draft' }
      ]"
      v-model="filter"
      class="mb-6"
    />

    <div v-if="store.loading" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <div v-else-if="filtered.length" class="space-y-3">
      <div
        v-for="post in filtered" :key="post.id"
        class="flex items-center justify-between p-4 border border-default rounded-lg"
      >
        <div class="min-w-0 flex-1">
          <NuxtLink :to="`/edit/${post.slug}`" class="font-medium hover:text-primary truncate block">
            {{ post.title }}
          </NuxtLink>
          <p class="text-xs text-muted mt-0.5">
            {{ post.status === 'published' ? `Published ${new Date(post.published_at!).toLocaleDateString()}` : 'Draft' }}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-4 shrink-0">
          <UBadge :color="post.status === 'published' ? 'success' : 'neutral'" :label="post.status" size="sm" />
          <UButton size="xs" variant="ghost" icon="i-lucide-pen" :to="`/edit/${post.slug}`" aria-label="Edit" />
          <UButton size="xs" variant="ghost"
            :icon="post.status === 'published' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            @click="toggleStatus(post)" aria-label="Toggle status" />
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2"
            @click="remove(post.id)" aria-label="Delete" />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16 text-muted">
      No {{ filter === 'all' ? '' : filter }} posts yet.
    </div>
  </UContainer>
</template>
