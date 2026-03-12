<script setup lang="ts">
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { usePostsStore } from '~/stores/posts'

const route = useRoute()
const store = usePostsStore()

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

// ── Render TipTap JSON → HTML ──────────────────────────
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
}

const contentHtml = computed(() => {
  const raw = post.value?.content
  if (!raw || typeof raw !== 'object') return ''
  try {
    const html = generateHTML(raw as Parameters<typeof generateHTML>[0], [
      StarterKit.configure({ link: false, underline: false }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline
    ])
    return sanitizeHtml(html)
  } catch {
    return ''
  }
})

// ── View tracking ──────────────────────────────────────
onMounted(() => {
  $fetch('/api/track', {
    method: 'POST',
    body: { post_id: post.value?.id, path: route.path }
  }).catch(() => {})
})

// ── View count + like state (single onMounted, parallel queries) ────────────
const viewCount = ref<number | null>(null)
const liked = ref(false)
const likeCount = ref(post.value?.likes?.[0]?.count ?? 0)
const showSignInNudge = ref(false)
const likeLoading = ref(false)

onMounted(async () => {
  const client = useSupabaseClient()
  const postId = post.value!.id
  const { data: { user } } = await client.auth.getUser()

  const [viewResult, likeResult] = await Promise.all([
    client.from('page_views').select('id', { count: 'exact', head: true }).eq('post_id', postId),
    user
      ? client.from('likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  viewCount.value = viewResult.count ?? 0
  liked.value = !!likeResult.data
})

async function toggleLike() {
  const client = useSupabaseClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) {
    showSignInNudge.value = true
    setTimeout(() => { showSignInNudge.value = false }, 4000)
    return
  }
  likeLoading.value = true
  if (liked.value) {
    await client.from('likes').delete()
      .eq('post_id', post.value!.id).eq('user_id', user.id)
    likeCount.value--
  } else {
    await client.from('likes').insert({ post_id: post.value!.id, user_id: user.id })
    likeCount.value++
  }
  liked.value = !liked.value
  likeLoading.value = false
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <UContainer class="py-10 max-w-3xl" v-if="post">

    <!-- Cover image -->
    <div v-if="post.cover_image_url" class="mb-8 rounded-2xl overflow-hidden">
      <img
        :src="post.cover_image_url"
        :alt="post.title"
        class="w-full h-72 object-cover"
      />
    </div>

    <!-- Tags -->
    <div v-if="post.tags?.length" class="flex flex-wrap gap-2 mb-5">
      <NuxtLink
        v-for="tag in post.tags"
        :key="tag.id"
        :to="`/tags/${tag.slug}`"
        class="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors"
      >
        {{ tag.name }}
      </NuxtLink>
    </div>

    <!-- Title -->
    <h1 class="text-3xl sm:text-4xl font-bold leading-tight mb-5">{{ post.title }}</h1>

    <!-- Author + meta -->
    <div class="flex flex-wrap items-center gap-3 text-sm text-muted mb-8 pb-8 border-b border-default">
      <NuxtLink :to="`/u/${post.author?.username}`" class="flex items-center gap-2 hover:text-sky-500 transition-colors">
        <UAvatar
          :src="post.author?.avatar_url || undefined"
          :alt="post.author?.full_name || ''"
          size="xs"
        />
        <span class="font-medium">{{ post.author?.full_name || post.author?.username }}</span>
      </NuxtLink>
      <span class="text-muted/40">·</span>
      <span>{{ formatDate(post.published_at) }}</span>
      <span class="text-muted/40">·</span>
      <span>{{ post.reading_time_mins }} min read</span>
      <span v-if="viewCount !== null" class="text-muted/40">·</span>
      <span v-if="viewCount !== null" class="flex items-center gap-1">
        <UIcon name="i-lucide-eye" class="size-3.5" />
        {{ viewCount.toLocaleString() }} views
      </span>
    </div>

    <!-- Post content (TipTap JSON → HTML) -->
    <div v-if="contentHtml" class="prose dark:prose-invert max-w-none" v-html="contentHtml" />
    <div v-else class="py-10 text-center text-muted text-sm">
      This post has no content yet.
    </div>

    <!-- ── End of post ad ──────────────────────────────── -->
    <LazyAdEndOfPost :post-slug="(route.params.slug as string)" />

    <!-- ── Like + reaction bar ─────────────────────────── -->
    <div class="mt-12 pt-8 border-t border-default">
      <div class="flex items-center gap-4">

        <!-- Like button -->
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium"
          :class="liked
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
            : 'border-default hover:border-sky-500/40 hover:bg-sky-500/5 text-muted hover:text-default'"
          :disabled="likeLoading"
          @click="toggleLike"
        >
          <UIcon
            :name="liked ? 'i-lucide-heart' : 'i-lucide-heart'"
            class="size-4 transition-transform"
            :class="liked ? 'fill-rose-500 scale-110' : ''"
          />
          <span>{{ likeCount }}</span>
        </button>

        <span class="text-sm text-muted">
          {{ likeCount === 1 ? '1 person liked this' : likeCount > 1 ? `${likeCount} people liked this` : 'Be the first to like this' }}
        </span>
      </div>

      <!-- Sign-in nudge (shown briefly when unauthed user clicks like) -->
      <Transition name="fade-slide">
        <div
          v-if="showSignInNudge"
          class="mt-3 flex items-center gap-2 text-sm text-muted bg-elevated px-4 py-2.5 rounded-xl border border-default"
        >
          <UIcon name="i-lucide-heart" class="size-4 text-rose-400 shrink-0" />
          <span>Join Knowledge Orbit to like and react to posts.</span>
          <NuxtLink to="/login" class="text-sky-500 font-medium hover:underline ml-auto shrink-0">
            Sign in →
          </NuxtLink>
        </div>
      </Transition>
    </div>

    <!-- ── Author card ─────────────────────────────────── -->
    <div v-if="post.author" class="mt-12 p-6 rounded-2xl border border-default bg-elevated/40">
      <div class="flex items-start gap-4">
        <UAvatar
          :src="post.author.avatar_url || undefined"
          :alt="post.author.full_name || ''"
          size="lg"
        />
        <div class="flex-1 min-w-0">
          <NuxtLink
            :to="`/u/${post.author.username}`"
            class="font-semibold hover:text-sky-500 transition-colors"
          >
            {{ post.author.full_name || post.author.username }}
          </NuxtLink>
          <p v-if="(post.author as any).bio" class="text-sm text-muted mt-1">
            {{ (post.author as any).bio }}
          </p>
          <p v-else class="text-sm text-muted mt-1">
            Writer at Knowledge Orbit
          </p>
        </div>
      </div>
    </div>

    <!-- ── Write for us CTA ────────────────────────────── -->
    <div class="mt-8 p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
      <p class="text-sm font-medium text-sky-600 dark:text-sky-400 mb-1">Have something to say?</p>
      <p class="text-sm text-muted mb-4">
        Knowledge Orbit is open to writers on any topic — anime, AI, security, dev, or anything you're passionate about.
      </p>
      <UButton
        to="/become-a-writer"
        label="Write for Knowledge Orbit"
        icon="i-lucide-pen-line"
        size="sm"
        variant="outline"
        color="neutral"
      />
    </div>

  </UContainer>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
