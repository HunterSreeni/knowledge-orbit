<script setup lang="ts">
const route = useRoute()
const client = useSupabaseClient()
const slug = route.params.slug as string

const { data: series } = await useAsyncData(`series-${slug}`, async () => {
  const { data } = await client
    .from('series')
    .select('id, title, description, slug, author:profiles(username, full_name, avatar_url)')
    .eq('slug', slug)
    .single()
  return data
})

if (!series.value) throw createError({ statusCode: 404, statusMessage: 'Series not found' })

useSeoMeta({
  title: `${series.value.title} — Knowledge Orbit`,
  description: series.value.description || `A series on Knowledge Orbit`
})

const { data: posts } = await useAsyncData(`series-posts-${slug}`, async () => {
  const { data } = await client
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image_url, reading_time_mins, published_at,
      author:profiles(id, username, full_name, avatar_url),
      tags:post_tags(tag:tags(id, name, slug)),
      likes:likes(count)
    `)
    .eq('series_id', series.value!.id)
    .eq('status', 'published')
    .order('published_at', { ascending: true })
  return (data ?? []).map(p => ({
    ...p,
    tags: (p.tags as unknown as { tag: { id: number; name: string; slug: string } }[])
      ?.map(pt => pt.tag) ?? []
  }))
})
</script>

<template>
  <UContainer class="py-10 max-w-4xl">

    <!-- Series header -->
    <div class="mb-10">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-medium mb-4">
        <UIcon name="i-lucide-layers" class="size-3" />
        Series · {{ posts?.length ?? 0 }} posts
      </div>

      <h1 class="text-3xl sm:text-4xl font-bold mb-3">{{ series!.title }}</h1>

      <p v-if="series!.description" class="text-muted text-lg leading-relaxed max-w-2xl mb-4">
        {{ series!.description }}
      </p>

      <NuxtLink
        v-if="series!.author"
        :to="`/u/${(series!.author as any).username}`"
        class="flex items-center gap-2 text-sm text-muted hover:text-sky-500 transition-colors w-fit"
      >
        <UAvatar
          :src="(series!.author as any).avatar_url || undefined"
          :alt="(series!.author as any).full_name || ''"
          size="xs"
        />
        <span>By {{ (series!.author as any).full_name || (series!.author as any).username }}</span>
      </NuxtLink>
    </div>

    <!-- Posts list -->
    <div v-if="posts?.length" class="space-y-4">
      <NuxtLink
        v-for="(post, i) in posts"
        :key="post.id"
        :to="`/posts/${post.slug}`"
        class="group flex items-start gap-4 p-5 rounded-xl border border-default hover:border-sky-500/40 transition-all hover:shadow-lg hover:shadow-sky-500/5"
      >
        <!-- Part number -->
        <div class="size-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
          {{ i + 1 }}
        </div>

        <!-- Cover (if any) -->
        <div v-if="post.cover_image_url" class="w-20 h-16 rounded-lg overflow-hidden shrink-0">
          <img :src="post.cover_image_url" :alt="post.title" class="w-full h-full object-cover" />
        </div>

        <div class="flex-1 min-w-0">
          <h2 class="font-semibold leading-snug group-hover:text-sky-500 transition-colors line-clamp-2 mb-1">
            {{ post.title }}
          </h2>
          <p v-if="post.excerpt" class="text-sm text-muted line-clamp-2 leading-relaxed mb-2">
            {{ post.excerpt }}
          </p>
          <div class="flex items-center gap-2 text-xs text-muted">
            <span>{{ post.reading_time_mins }}m read</span>
            <span v-if="post.published_at">
              · {{ new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
            </span>
            <div v-if="post.tags?.length" class="flex gap-1 ml-2">
              <span
                v-for="tag in post.tags.slice(0, 2)"
                :key="tag.id"
                class="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400"
              >
                {{ tag.name }}
              </span>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-20">
      <UIcon name="i-lucide-layers" class="size-12 text-muted/30 mx-auto mb-4" />
      <p class="text-muted">No posts in this series yet.</p>
    </div>

  </UContainer>
</template>
