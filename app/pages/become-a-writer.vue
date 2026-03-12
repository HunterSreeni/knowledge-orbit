<script setup lang="ts">
useSeoMeta({
  title: 'Write for Knowledge Orbit',
  description: 'Share your ideas on anime, AI, security, dev tools and more. Free to join. Your words, your audience.'
})

const topics = [
  { icon: 'i-lucide-tv-2', label: 'Anime & Manga', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: 'i-lucide-brain-circuit', label: 'AI & LLMs', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: 'i-lucide-shield', label: 'Security & CTF', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { icon: 'i-lucide-code-2', label: 'Dev & Tools', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: 'i-lucide-briefcase', label: 'Career & Growth', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: 'i-lucide-gamepad-2', label: 'Gaming', color: 'text-rose-500', bg: 'bg-rose-500/10' },
]

const steps = [
  { n: '01', title: 'Create your account', desc: 'Sign up in 30 seconds with email or Google. No credit card, no subscription.' },
  { n: '02', title: 'Write your first post', desc: 'Use our clean editor — type in Markdown or rich text. Add images, code blocks, quotes.' },
  { n: '03', title: 'Publish to the world', desc: 'Hit publish. Your post goes live immediately. Track views, reactions, and reach.' },
]
</script>

<template>
  <div>

    <!-- ── Hero ───────────────────────────────────────── -->
    <div class="relative overflow-hidden border-b border-default">
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div class="h-[600px] w-[1000px] rounded-full bg-sky-500/5 dark:bg-sky-500/8 blur-3xl" />
      </div>

      <UContainer class="relative max-w-4xl py-20 sm:py-28 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 text-xs font-medium mb-6">
          <UIcon name="i-lucide-pen-line" class="size-3" />
          Writers wanted · All topics welcome
        </div>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
          You have something<br class="hidden sm:block" />
          <span class="text-sky-500">worth saying.</span>
        </h1>

        <p class="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-10">
          Knowledge Orbit is a home for curious minds — writers who geek out over anime,
          dissect AI models, document security finds, or share career lessons.
          <strong class="text-default">Free forever. No gatekeeping.</strong>
        </p>

        <UButton
          to="/login?intent=write"
          label="Start writing — it's free"
          icon="i-lucide-arrow-right"
          trailing
          size="xl"
        />

        <p class="text-xs text-muted mt-4">No credit card. No approval process. Just write.</p>
      </UContainer>
    </div>

    <!-- ── Topics ─────────────────────────────────────── -->
    <UContainer class="max-w-4xl py-16">
      <p class="text-center text-sm font-semibold uppercase tracking-widest text-muted mb-10">
        What do you want to write about?
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          v-for="topic in topics"
          :key="topic.label"
          class="flex items-center gap-3 p-4 rounded-xl border border-default hover:border-sky-500/30 transition-colors cursor-default"
        >
          <div class="size-9 rounded-lg flex items-center justify-center shrink-0" :class="topic.bg">
            <UIcon :name="topic.icon" class="size-5" :class="topic.color" />
          </div>
          <span class="font-medium text-sm">{{ topic.label }}</span>
        </div>
      </div>

      <p class="text-center text-sm text-muted mt-6">
        Or literally anything else — if you're passionate about it, there's an audience for it.
      </p>
    </UContainer>

    <!-- ── How it works ───────────────────────────────── -->
    <div class="border-t border-default bg-elevated/30">
      <UContainer class="max-w-4xl py-16">
        <p class="text-center text-sm font-semibold uppercase tracking-widest text-muted mb-12">
          How it works
        </p>

        <div class="grid sm:grid-cols-3 gap-8">
          <div v-for="step in steps" :key="step.n" class="text-center sm:text-left">
            <div class="text-4xl font-bold text-sky-500/20 mb-3">{{ step.n }}</div>
            <h3 class="font-semibold mb-2">{{ step.title }}</h3>
            <p class="text-sm text-muted leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </UContainer>
    </div>

    <!-- ── What you get ───────────────────────────────── -->
    <div class="border-t border-default">
      <UContainer class="max-w-4xl py-16">
        <p class="text-center text-sm font-semibold uppercase tracking-widest text-muted mb-10">
          What writers get
        </p>

        <div class="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div
            v-for="perk in [
              'A clean, distraction-free editor',
              'Markdown shortcut support',
              'Cover image + tags per post',
              'Real view counts per post',
              'Reader reactions & likes',
              'Your own author profile page',
              'Dashboard to manage all posts',
              'Instant publishing — no approval',
            ]"
            :key="perk"
            class="flex items-center gap-3 text-sm"
          >
            <UIcon name="i-lucide-check" class="size-4 text-sky-500 shrink-0" />
            {{ perk }}
          </div>
        </div>
      </UContainer>
    </div>

    <!-- ── Final CTA ──────────────────────────────────── -->
    <div class="border-t border-default bg-elevated/30">
      <UContainer class="max-w-4xl py-20 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold mb-4">
          Ready to share your perspective?
        </h2>
        <p class="text-muted mb-8 max-w-lg mx-auto">
          Join Knowledge Orbit. Write your first post today.
          Your ideas are already worth reading.
        </p>

        <div class="flex flex-wrap gap-4 justify-center">
          <UButton
            to="/login?intent=write"
            label="Create your account"
            icon="i-lucide-user-plus"
            size="lg"
          />
          <UButton
            to="/"
            label="Read the blog first"
            size="lg"
            variant="ghost"
            color="neutral"
          />
        </div>
      </UContainer>
    </div>

  </div>
</template>
