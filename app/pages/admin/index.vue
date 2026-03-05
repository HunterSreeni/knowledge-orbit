<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Admin — Knowledge Orbit' })

const client = useSupabaseClient()

const stats = ref({ posts: 0, published: 0, users: 0, likes: 0 })

onMounted(async () => {
  const [
    { count: posts },
    { count: published },
    { count: users },
    { count: likes }
  ] = await Promise.all([
    client.from('posts').select('*', { count: 'exact', head: true }),
    client.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    client.from('profiles').select('*', { count: 'exact', head: true }),
    client.from('likes').select('*', { count: 'exact', head: true })
  ])
  stats.value = { posts: posts ?? 0, published: published ?? 0, users: users ?? 0, likes: likes ?? 0 }
})

const cards = computed(() => [
  { label: 'Total Posts', value: stats.value.posts, icon: 'i-lucide-file-text', to: '/admin/posts' },
  { label: 'Published', value: stats.value.published, icon: 'i-lucide-globe', to: '/admin/posts' },
  { label: 'Users', value: stats.value.users, icon: 'i-lucide-users', to: '/admin/users' },
  { label: 'Total Likes', value: stats.value.likes, icon: 'i-lucide-heart', to: null }
])
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Overview</h1>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink
        v-for="card in cards" :key="card.label"
        :to="card.to || '#'"
        class="p-5 border border-default rounded-xl hover:bg-elevated transition-colors"
      >
        <UIcon :name="card.icon" class="w-6 h-6 text-primary mb-3" />
        <p class="text-2xl font-bold">{{ card.value }}</p>
        <p class="text-sm text-muted">{{ card.label }}</p>
      </NuxtLink>
    </div>

    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink to="/admin/ads" class="p-5 border border-default rounded-xl hover:bg-elevated transition-colors flex items-center gap-4">
        <UIcon name="i-lucide-megaphone" class="w-8 h-8 text-primary" />
        <div>
          <p class="font-semibold">Ads Manager</p>
          <p class="text-sm text-muted">Manage ad placements, rotation, and performance</p>
        </div>
      </NuxtLink>
      <NuxtLink to="/admin/analytics" class="p-5 border border-default rounded-xl hover:bg-elevated transition-colors flex items-center gap-4">
        <UIcon name="i-lucide-bar-chart-2" class="w-8 h-8 text-primary" />
        <div>
          <p class="font-semibold">Analytics</p>
          <p class="text-sm text-muted">Page views, top posts, traffic sources</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
