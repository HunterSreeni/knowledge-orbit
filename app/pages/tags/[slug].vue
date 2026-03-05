<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

const route = useRoute()
const store = usePostsStore()
const slug = route.params.slug as string

useSeoMeta({
  title: `#${slug} — Knowledge Orbit`,
  description: `Browse all posts tagged with ${slug}`
})

onMounted(() => store.fetchByTag(slug, true))
</script>

<template>
  <UContainer class="py-8 max-w-5xl">
    <div class="mb-8">
      <UBadge :label="`#${$route.params.slug}`" size="lg" class="mb-2" />
      <h1 class="text-2xl font-bold">Posts tagged "{{ $route.params.slug }}"</h1>
    </div>

    <div v-if="store.loading && !store.posts.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-64 rounded-xl" />
    </div>

    <div v-else-if="store.posts.length" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <PostCard v-for="post in store.posts" :key="post.id" :post="post" />
    </div>

    <div v-else class="text-center py-16 text-muted">No posts with this tag yet.</div>

    <div v-if="store.hasMore" class="mt-10 flex justify-center">
      <UButton label="Load more" variant="outline" :loading="store.loading"
        @click="store.fetchByTag(slug)" />
    </div>
  </UContainer>
</template>
