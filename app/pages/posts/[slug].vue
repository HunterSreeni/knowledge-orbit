<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

const route = useRoute()
const store = usePostsStore()
const client = useSupabaseClient()
const user = useSupabaseUser()

const { data: post } = await useAsyncData(`post-${route.params.slug}`, () =>
  store.fetchBySlug(route.params.slug as string)
)

if (!post.value) throw createError({ statusCode: 404, statusMessage: 'Post not found' })

useSeoMeta({
  title: () => `${post.value?.title} — Knowledge Orbit`,
  description: () => post.value?.excerpt || '',
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.excerpt || '',
  ogImage: () => post.value?.cover_image_url || undefined,
  ogType: 'article',
  twitterCard: 'summary_large_image'
})

// Like handling
const liked = ref(false)
const likeCount = ref(post.value?.likes?.[0]?.count ?? 0)

onMounted(async () => {
  if (!user.value) return
  const { data } = await client
    .from('likes')
    .select('id')
    .eq('post_id', post.value!.id)
    .eq('user_id', user.value.id)
    .single()
  liked.value = !!data
})

async function toggleLike() {
  if (!user.value) return navigateTo('/login')
  if (liked.value) {
    await client.from('likes').delete()
      .eq('post_id', post.value!.id).eq('user_id', user.value.id)
    likeCount.value--
  } else {
    await client.from('likes').insert({ post_id: post.value!.id, user_id: user.value.id })
    likeCount.value++
  }
  liked.value = !liked.value
}
</script>

<template>
  <UContainer class="py-10 max-w-3xl" v-if="post">
    <!-- Cover -->
    <img
      v-if="post.cover_image_url"
      :src="post.cover_image_url"
      :alt="post.title"
      class="w-full h-64 object-cover rounded-2xl mb-8"
    />

    <!-- Tags -->
    <div class="flex flex-wrap gap-2 mb-4">
      <UBadge
        v-for="tag in post.tags"
        :key="tag.id"
        :label="tag.name"
        variant="subtle"
        color="primary"
        :to="`/tags/${tag.slug}`"
        as="a"
      />
    </div>

    <!-- Title -->
    <h1 class="text-3xl font-bold leading-tight mb-4">{{ post.title }}</h1>

    <!-- Meta -->
    <div class="flex items-center gap-4 text-sm text-muted mb-8">
      <NuxtLink :to="`/u/${post.author?.username}`" class="flex items-center gap-2 hover:text-primary">
        <UAvatar :src="post.author?.avatar_url || undefined" :alt="post.author?.full_name || ''" size="xs" />
        {{ post.author?.full_name }}
      </NuxtLink>
      <span>·</span>
      <span>{{ post.reading_time_mins }} min read</span>
      <span v-if="post.published_at">·</span>
      <span v-if="post.published_at">{{ new Date(post.published_at).toLocaleDateString() }}</span>
    </div>

    <!-- Content (TipTap JSON rendered as HTML via prose) -->
    <div id="post-content" class="prose dark:prose-invert max-w-none" v-html="post.content" />

    <!-- Like -->
    <div class="mt-12 flex items-center gap-3">
      <UButton
        :icon="liked ? 'i-lucide-heart' : 'i-lucide-heart'"
        :color="liked ? 'error' : 'neutral'"
        variant="outline"
        :label="`${likeCount}`"
        @click="toggleLike"
      />
    </div>
  </UContainer>
</template>
