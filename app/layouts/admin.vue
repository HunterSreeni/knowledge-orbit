<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()

const navLinks = [
  { label: 'Overview', to: '/admin', icon: 'i-lucide-layout-dashboard', exact: true },
  { label: 'Posts', to: '/admin/posts', icon: 'i-lucide-file-text' },
  { label: 'Users', to: '/admin/users', icon: 'i-lucide-users' },
  { label: 'Tags', to: '/admin/tags', icon: 'i-lucide-tag' },
  { label: 'Series', to: '/admin/series', icon: 'i-lucide-layers' },
  { label: 'Ads Manager', to: '/admin/ads', icon: 'i-lucide-megaphone' },
  { label: 'Analytics', to: '/admin/analytics', icon: 'i-lucide-bar-chart-2' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="text-muted text-sm">← Back to site</NuxtLink>
        <span class="text-muted mx-2">/</span>
        <span class="font-semibold">Admin Panel</span>
      </template>
      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <div class="flex flex-1">
      <!-- Sidebar -->
      <aside class="w-56 shrink-0 border-r border-default p-4 hidden md:block">
        <nav class="space-y-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="(link.exact ? route.path === link.to : route.path.startsWith(link.to))
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted hover:bg-elevated hover:text-default'"
          >
            <UIcon :name="link.icon" class="w-4 h-4 shrink-0" />
            {{ link.label }}
          </NuxtLink>
        </nav>
      </aside>

      <!-- Content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
