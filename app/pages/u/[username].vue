<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

const route = useRoute()
const client = useSupabaseClient()
const store = usePostsStore()
const username = route.params.username as string

const { data: profile } = await useAsyncData(`profile-${username}`, async () => {
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  return data
})

if (!profile.value) throw createError({ statusCode: 404, statusMessage: 'User not found' })

useSeoMeta({
  title: `${profile.value.full_name || username} — Knowledge Orbit`,
  description: profile.value.bio || `Posts by ${profile.value.full_name || username}`
})

const posts = ref<ReturnType<typeof store.fetchByAuthor> extends Promise<infer T> ? T : never>([])
onMounted(async () => { posts.value = await store.fetchByAuthor(username) })
</script>

<template>
  <UContainer class="py-10 max-w-4xl">
    <!-- Author header -->
    <div class="flex items-start gap-6 mb-10">
      <UAvatar :src="profile!.avatar_url || undefined" :alt="profile!.full_name || username" size="2xl" />
      <div>
        <h1 class="text-2xl font-bold">{{ profile!.full_name || username }}</h1>
        <p class="text-muted text-sm">@{{ username }}</p>
        <p v-if="profile!.bio" class="mt-2 text-sm">{{ profile!.bio }}</p>
        <a v-if="profile!.website" :href="profile!.website" target="_blank" rel="noopener"
          class="text-primary text-sm mt-1 block hover:underline">
          {{ profile!.website }}
        </a>
      </div>
    </div>

    <h2 class="text-lg font-semibold mb-4">Posts by {{ profile!.full_name || username }}</h2>

    <div v-if="store.loading" class="grid gap-6 md:grid-cols-2">
      <USkeleton v-for="i in 4" :key="i" class="h-48 rounded-xl" />
    </div>
    <div v-else-if="posts.length" class="grid gap-6 md:grid-cols-2">
      <PostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
    <div v-else class="text-center py-12 text-muted">No published posts yet.</div>
  </UContainer>
</template>
