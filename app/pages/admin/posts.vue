<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Admin Posts — Knowledge Orbit' })

const store = usePostsStore()
const client = useSupabaseClient()
const posts = ref<(typeof store.posts)>([])

onMounted(async () => {
  const { data } = await client
    .from('posts')
    .select('id, title, slug, status, published_at, created_at, author:profiles(username, full_name)')
    .order('created_at', { ascending: false })
  posts.value = data ?? []
})

async function toggleStatus(post: (typeof posts.value)[0]) {
  try {
    if (post.status === 'published') {
      await store.unpublishPost(post.id)
      post.status = 'draft'
    } else {
      await store.publishPost(post.id)
      post.status = 'published'
    }
  } catch (e) {
    console.error('Failed to update post status:', e)
  }
}

async function remove(id: string) {
  if (!confirm('Delete this post?')) return
  try {
    await store.deletePost(id)
    posts.value = posts.value.filter(p => p.id !== id)
  } catch (e) {
    console.error('Failed to delete post:', e)
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-6">All Posts</h1>
    <UTable
      :data="posts"
      :columns="[
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'status', label: 'Status' },
        { key: 'published_at', label: 'Published' },
        { key: 'actions', label: '' }
      ]"
    >
      <template #title-cell="{ row }">
        <NuxtLink :to="`/posts/${row.original.slug}`" class="hover:text-primary font-medium">
          {{ row.original.title }}
        </NuxtLink>
      </template>
      <template #author-cell="{ row }">
        {{ row.original.author?.full_name || row.original.author?.username || '—' }}
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="row.original.status === 'published' ? 'success' : 'neutral'" :label="row.original.status" size="sm" />
      </template>
      <template #published_at-cell="{ row }">
        {{ row.original.published_at ? new Date(row.original.published_at).toLocaleDateString() : '—' }}
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1 justify-end">
          <UButton size="xs" variant="ghost" :to="`/edit/${row.original.slug}`" icon="i-lucide-pen" />
          <UButton size="xs" variant="ghost"
            :icon="row.original.status === 'published' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            @click="toggleStatus(row.original)" />
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="remove(row.original.id)" />
        </div>
      </template>
    </UTable>
  </div>
</template>
