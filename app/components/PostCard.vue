<script setup lang="ts">
import type { Post } from '~/types'

const props = defineProps<{
  post: Post
  horizontal?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="`/posts/${post.slug}`"
    class="group block border border-default rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
    :class="horizontal ? 'flex gap-4' : ''"
  >
    <img
      v-if="post.cover_image_url"
      :src="post.cover_image_url"
      :alt="post.title"
      class="object-cover bg-elevated"
      :class="horizontal ? 'w-32 h-full shrink-0' : 'w-full h-44'"
    />
    <div class="p-4 flex flex-col gap-2 flex-1">
      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="tag in post.tags?.slice(0, 3)"
          :key="tag.id"
          :label="tag.name"
          size="xs"
          variant="soft"
          color="primary"
        />
      </div>
      <h2 class="font-semibold leading-snug group-hover:text-primary line-clamp-2">
        {{ post.title }}
      </h2>
      <p v-if="post.excerpt" class="text-sm text-muted line-clamp-2">{{ post.excerpt }}</p>
      <div class="flex items-center gap-2 mt-auto pt-2 text-xs text-muted">
        <UAvatar
          :src="post.author?.avatar_url || undefined"
          :alt="post.author?.full_name || ''"
          size="2xs"
        />
        <span>{{ post.author?.full_name || post.author?.username }}</span>
        <span>·</span>
        <span>{{ post.reading_time_mins }} min read</span>
      </div>
    </div>
  </NuxtLink>
</template>
