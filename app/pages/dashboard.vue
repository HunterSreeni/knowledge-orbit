<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Dashboard — Knowledge Orbit' })

const auth = useAuthStore()
const store = usePostsStore()
const myPosts = ref<typeof store.posts>([])
const filter = ref<'all' | 'published' | 'draft'>('all')
const loadError = ref('')
const actionError = ref('')
const deletingId = ref<string | null>(null)
const togglingId = ref<string | null>(null)

onMounted(async () => {
  try {
    myPosts.value = await store.fetchMyPosts()
  } catch {
    loadError.value = 'Failed to load your posts. Please refresh the page.'
  }
})

const filtered = computed(() => {
  if (filter.value === 'all') return myPosts.value
  return myPosts.value.filter(p => p.status === filter.value)
})

const counts = computed(() => ({
  all: myPosts.value.length,
  published: myPosts.value.filter(p => p.status === 'published').length,
  draft: myPosts.value.filter(p => p.status === 'draft').length
}))

async function toggleStatus(post: (typeof myPosts.value)[0]) {
  togglingId.value = post.id
  actionError.value = ''
  try {
    if (post.status === 'published') {
      await store.unpublishPost(post.id)
      post.status = 'draft'
    } else {
      await store.publishPost(post.id)
      post.status = 'published'
    }
  } catch {
    actionError.value = `Failed to ${post.status === 'published' ? 'unpublish' : 'publish'} post. Please try again.`
  } finally {
    togglingId.value = null
  }
}

async function remove(id: string, title: string) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
  deletingId.value = id
  actionError.value = ''
  try {
    await store.deletePost(id)
    myPosts.value = myPosts.value.filter(p => p.id !== id)
  } catch {
    actionError.value = 'Failed to delete post. Please try again.'
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-4xl">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">My Posts</h1>
        <p v-if="auth.profile" class="text-sm text-muted mt-0.5">
          {{ auth.profile.full_name || auth.profile.username }}
          · {{ counts.all }} post{{ counts.all !== 1 ? 's' : '' }}
        </p>
      </div>
      <UButton to="/write" icon="i-lucide-pen-line" label="New Post" />
    </div>

    <!-- Load error -->
    <UAlert
      v-if="loadError"
      :title="loadError"
      color="error"
      variant="soft"
      icon="i-lucide-wifi-off"
      class="mb-4"
    />

    <!-- Action error -->
    <UAlert
      v-if="actionError"
      :title="actionError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      class="mb-4"
      @close="actionError = ''"
    />

    <!-- Filter tabs -->
    <div class="flex gap-1 mb-6 border-b border-default">
      <button
        v-for="tab in [
          { label: 'All', value: 'all', count: counts.all },
          { label: 'Published', value: 'published', count: counts.published },
          { label: 'Drafts', value: 'draft', count: counts.draft }
        ]"
        :key="tab.value"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="filter === tab.value
          ? 'border-sky-500 text-sky-600 dark:text-sky-400'
          : 'border-transparent text-muted hover:text-default'"
        @click="filter = tab.value as typeof filter"
      >
        {{ tab.label }}
        <span class="ml-1.5 text-xs opacity-70">({{ tab.count }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Post list -->
    <div v-else-if="filtered.length" class="space-y-2">
      <div
        v-for="post in filtered"
        :key="post.id"
        class="flex items-center justify-between p-4 border border-default rounded-xl hover:border-sky-500/30 transition-colors"
        :class="{ 'opacity-60': deletingId === post.id }"
      >
        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="`/posts/${post.slug}`"
            class="font-medium hover:text-sky-500 transition-colors truncate block"
          >
            {{ post.title }}
          </NuxtLink>
          <p class="text-xs text-muted mt-0.5 flex items-center gap-2">
            <span
              class="inline-block size-1.5 rounded-full"
              :class="post.status === 'published' ? 'bg-green-500' : 'bg-zinc-400'"
            />
            {{ post.status === 'published'
              ? `Published ${new Date(post.published_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Draft · not visible to readers'
            }}
            <span v-if="post.reading_time_mins">· {{ post.reading_time_mins }}m read</span>
          </p>
        </div>

        <div class="flex items-center gap-1 ml-4 shrink-0">
          <!-- Publish/unpublish -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="post.status === 'published' ? 'i-lucide-eye' : 'i-lucide-eye-off'"
            :loading="togglingId === post.id"
            :aria-label="post.status === 'published' ? 'Unpublish' : 'Publish'"
            @click="toggleStatus(post)"
          />
          <!-- Delete -->
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            :loading="deletingId === post.id"
            aria-label="Delete"
            @click="remove(post.id, post.title)"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-20">
      <UIcon name="i-lucide-file-text" class="size-12 text-muted/30 mx-auto mb-4" />
      <p class="text-muted font-medium">
        {{ filter === 'all' ? 'No posts yet' : `No ${filter} posts` }}
      </p>
      <p class="text-sm text-muted mt-1">
        {{ filter === 'all' ? 'Write your first post to get started.' : '' }}
      </p>
      <UButton v-if="filter === 'all'" to="/write" label="Write your first post" class="mt-4" />
    </div>

  </UContainer>
</template>
