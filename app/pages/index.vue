<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'

useSeoMeta({
  title: 'Knowledge Orbit — Read freely. Write boldly.',
  description: 'Anime, AI/LLM, security, dev tools, and more. No sign-up needed to read.'
})

const store = usePostsStore()

// SSR: fetch feed on the server so the page renders with data — no client-side skeleton
await useAsyncData('feed', async () => {
  await store.fetchFeed(true)
  return store.posts
}, { server: true })
</script>

<template>
  <div>
    <!-- ── Hero ──────────────────────────────────────────── -->
    <div class="relative overflow-hidden border-b border-default">
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div class="h-[500px] w-[900px] rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-3xl" />
      </div>

      <UContainer class="relative max-w-5xl py-20 sm:py-28 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-medium mb-6">
          <span class="size-1.5 rounded-full bg-sky-500 animate-pulse" />
          Free to read · No account needed
        </div>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
          Read freely.<br class="hidden sm:block" />
          <span class="text-sky-500">Write boldly.</span>
        </h1>

        <p class="mt-5 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          Anime, AI, security, dev tools — diverse voices on topics that matter.
          No paywall, no sign-up to read.
        </p>

        <div class="mt-8 flex flex-wrap gap-3 justify-center">
          <UButton
            to="/search"
            label="Explore posts"
            icon="i-lucide-search"
            size="lg"
          />
          <UButton
            to="/become-a-writer"
            label="Become a writer"
            icon="i-lucide-pen-line"
            size="lg"
            variant="outline"
            color="neutral"
          />
        </div>

        <!-- Topic chips -->
        <div class="mt-10 flex flex-wrap gap-2 justify-center">
          <NuxtLink
            v-for="topic in ['Anime', 'AI & LLMs', 'Security', 'Dev Tools', 'Career', 'Gaming']"
            :key="topic"
            :to="`/search?q=${encodeURIComponent(topic)}`"
            class="px-3 py-1 rounded-full border border-default text-xs text-muted hover:border-sky-500/40 hover:text-sky-500 transition-colors"
          >
            {{ topic }}
          </NuxtLink>
        </div>
      </UContainer>
    </div>

    <!-- ── Banner ad ────────────────────────────────────── -->
    <UContainer class="max-w-5xl pt-6">
      <LazyAdBanner />
    </UContainer>

    <!-- ── Feed ──────────────────────────────────────────── -->
    <UContainer class="max-w-5xl py-12">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-xl font-bold">Latest Posts</h2>
          <p class="text-sm text-muted mt-0.5">Fresh perspectives from the community</p>
        </div>
      </div>

      <!-- Loading skeletons -->
      <div v-if="store.loading && !store.posts.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="rounded-xl border border-default overflow-hidden">
          <USkeleton class="h-44 w-full rounded-none" />
          <div class="p-4 space-y-2">
            <USkeleton class="h-3 w-16 rounded-full" />
            <USkeleton class="h-5 w-3/4 rounded" />
            <USkeleton class="h-3 w-full rounded" />
            <USkeleton class="h-3 w-2/3 rounded" />
          </div>
        </div>
      </div>

      <div v-else-if="store.posts.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <PostCard v-for="post in store.posts" :key="post.id" :post="post" />
      </div>

      <div v-else class="text-center py-24">
        <UIcon name="i-lucide-orbit" class="size-12 text-muted/30 mx-auto mb-4" />
        <p class="text-muted">No posts yet.</p>
        <UButton to="/become-a-writer" label="Be the first to write" class="mt-4" />
      </div>

      <div v-if="store.hasMore" class="mt-10 flex justify-center">
        <UButton
          label="Load more"
          variant="outline"
          color="neutral"
          :loading="store.loading"
          @click="store.fetchFeed()"
        />
      </div>
    </UContainer>

    <!-- ── Writer CTA banner ─────────────────────────────── -->
    <div class="border-t border-default bg-elevated/30">
      <UContainer class="max-w-5xl py-16">
        <div class="grid sm:grid-cols-2 gap-10 items-center">
          <!-- Left: pitch -->
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium mb-4">
              <UIcon name="i-lucide-pen-line" class="size-3" />
              Open to writers
            </div>
            <h2 class="text-2xl sm:text-3xl font-bold leading-tight mb-3">
              Your ideas deserve<br />an audience.
            </h2>
            <p class="text-muted leading-relaxed mb-6">
              Write about anything you're passionate about — anime breakdowns, AI experiments,
              CTF writeups, career tips, dev hacks. If you have something to say, Knowledge Orbit is your stage.
            </p>
            <div class="flex gap-3 flex-wrap">
              <UButton
                to="/become-a-writer"
                label="Start writing free"
                icon="i-lucide-arrow-right"
                trailing
              />
              <UButton
                to="/search"
                label="Read first"
                variant="ghost"
                color="neutral"
              />
            </div>
          </div>

          <!-- Right: 3 reasons -->
          <div class="space-y-4">
            <div
              v-for="reason in [
                { icon: 'i-lucide-globe', title: 'Any topic, any depth', desc: 'Anime, AI, security, career — all voices welcome. No editorial gatekeeping.' },
                { icon: 'i-lucide-users', title: 'Real readers', desc: 'Every view is tracked honestly. See exactly who reads your work.' },
                { icon: 'i-lucide-zap', title: 'Instant publishing', desc: 'Write, preview, publish. No approval process. Your words go live immediately.' }
              ]"
              :key="reason.title"
              class="flex gap-4 p-4 rounded-xl border border-default hover:border-sky-500/30 transition-colors"
            >
              <div class="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <UIcon :name="reason.icon" class="size-4 text-sky-500" />
              </div>
              <div>
                <p class="font-medium text-sm">{{ reason.title }}</p>
                <p class="text-xs text-muted mt-0.5 leading-relaxed">{{ reason.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </div>
  </div>
</template>
