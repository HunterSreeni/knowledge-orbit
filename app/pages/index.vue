<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

useSeoMeta({
  title: 'Knowledge Orbit — Diverse Perspectives',
  description: 'Anime, AI/LLM, security, dev tools, and more. Written by passionate people.'
})

const store = usePostsStore()

onMounted(async () => {
  await store.fetchFeed(true)
})
</script>

<template>
  <UContainer class="py-8 max-w-5xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Latest Posts</h1>
      <p class="text-muted mt-1">Explore ideas from our community</p>
    </div>

    <div v-if="store.loading && !store.posts.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-64 rounded-xl" />
    </div>

    <div v-else-if="store.posts.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <PostCard v-for="post in store.posts" :key="post.id" :post="post" />
    </div>

    <div v-else class="text-center py-20 text-muted">
      No posts yet. Be the first to
      <NuxtLink to="/write" class="text-primary underline">write one</NuxtLink>!
    </div>

    <div v-if="store.hasMore" class="mt-10 flex justify-center">
      <UButton label="Load more" variant="outline" :loading="store.loading" @click="store.fetchFeed()" />
    </div>
  </UContainer>
</template>
