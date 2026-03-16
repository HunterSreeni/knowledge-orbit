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
const totalLikes = ref(0)

onMounted(async () => {
  posts.value = await store.fetchByAuthor(username)
  // Count total likes across all posts
  totalLikes.value = posts.value.reduce((sum: number, p: any) => sum + (p.likes?.[0]?.count ?? 0), 0)
})

function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? url : null
  } catch { return null }
}

const socialLinks = computed(() => {
  const p = profile.value as any
  const links = []
  if (p?.twitter_url && safeUrl(p.twitter_url)) links.push({ icon: 'i-simple-icons-x', href: safeUrl(p.twitter_url)!, label: 'Twitter' })
  if (p?.linkedin_url && safeUrl(p.linkedin_url)) links.push({ icon: 'i-simple-icons-linkedin', href: safeUrl(p.linkedin_url)!, label: 'LinkedIn' })
  if (p?.github_url && safeUrl(p.github_url)) links.push({ icon: 'i-simple-icons-github', href: safeUrl(p.github_url)!, label: 'GitHub' })
  if (p?.website && safeUrl(p.website)) links.push({ icon: 'i-lucide-globe', href: safeUrl(p.website)!, label: 'Website' })
  return links
})
</script>

<template>
  <UContainer class="py-10 max-w-4xl">
    <!-- Author header -->
    <div class="flex items-start gap-6 mb-10">
      <UAvatar :src="profile!.avatar_url || undefined" :alt="profile!.full_name || username" size="2xl" />
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold">{{ profile!.full_name || username }}</h1>
        <p class="text-muted text-sm">@{{ username }}</p>
        <p v-if="profile!.bio" class="mt-2 text-sm leading-relaxed">{{ profile!.bio }}</p>

        <!-- Social links -->
        <div v-if="socialLinks.length" class="flex items-center gap-2 mt-3">
          <a
            v-for="link in socialLinks"
            :key="link.label"
            :href="link.href"
            target="_blank"
            rel="noopener"
            :title="link.label"
            class="size-8 rounded-full border border-default flex items-center justify-center text-muted hover:text-sky-500 hover:border-sky-500/40 transition-colors"
          >
            <UIcon :name="link.icon" class="size-3.5" />
          </a>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4 mt-4 text-sm text-muted">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-file-text" class="size-3.5" />
            {{ posts.length }} posts
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-heart" class="size-3.5" />
            {{ totalLikes }} likes
          </span>
        </div>
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
