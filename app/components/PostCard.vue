<script setup lang="ts">
import type { Post } from '~/types'

const props = defineProps<{
  post: Post
  horizontal?: boolean
}>()

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <NuxtLink
    :to="`/posts/${post.slug}`"
    class="group flex flex-col rounded-xl border border-default bg-default overflow-hidden transition-all duration-200 hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/5 dark:hover:shadow-sky-500/10"
    :class="horizontal ? 'flex-row' : ''"
  >
    <!-- Cover image -->
    <div
      v-if="post.cover_image_url"
      class="overflow-hidden bg-elevated shrink-0"
      :class="horizontal ? 'w-36 h-full' : 'h-44'"
    >
      <img
        :src="post.cover_image_url"
        :alt="post.title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
    <div
      v-else
      class="bg-elevated shrink-0 flex items-center justify-center"
      :class="horizontal ? 'w-36' : 'h-44'"
    >
      <UIcon name="i-lucide-orbit" class="size-10 text-muted/30" />
    </div>

    <!-- Content -->
    <div class="flex flex-col gap-2.5 p-4 flex-1">
      <!-- Tags -->
      <div v-if="post.tags?.length" class="flex flex-wrap gap-1">
        <span
          v-for="tag in post.tags.slice(0, 3)"
          :key="tag.id"
          class="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium"
        >
          {{ tag.name }}
        </span>
      </div>

      <!-- Title -->
      <h2 class="font-semibold leading-snug line-clamp-2 group-hover:text-sky-500 transition-colors">
        {{ post.title }}
      </h2>

      <!-- Excerpt -->
      <p v-if="post.excerpt" class="text-sm text-muted line-clamp-2 leading-relaxed flex-1">
        {{ post.excerpt }}
      </p>

      <!-- Meta -->
      <div class="flex items-center gap-2 mt-auto pt-1 text-xs text-muted">
        <UAvatar
          :src="post.author?.avatar_url || undefined"
          :alt="post.author?.full_name || ''"
          size="2xs"
        />
        <span class="truncate">{{ post.author?.full_name || post.author?.username }}</span>
        <span class="shrink-0">·</span>
        <span class="shrink-0">{{ post.reading_time_mins }}m read</span>
        <span v-if="post.published_at" class="shrink-0 ml-auto hidden sm:block">
          {{ formatDate(post.published_at) }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
