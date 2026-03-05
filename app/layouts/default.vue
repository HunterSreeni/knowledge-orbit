<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const colorMode = useColorMode()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="font-bold text-lg text-primary">
          Knowledge Orbit
        </NuxtLink>
      </template>

      <template #right>
        <UButton to="/search" icon="i-lucide-search" variant="ghost" color="neutral" aria-label="Search" />
        <UColorModeButton />

        <template v-if="auth.isAuthed">
          <UButton to="/write" icon="i-lucide-pen-line" variant="ghost" color="neutral" aria-label="Write" />
          <UDropdownMenu
            :items="[
              [{ label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-layout-dashboard' }],
              auth.isAdmin ? [{ label: 'Admin Panel', to: '/admin', icon: 'i-lucide-shield' }] : [],
              [{ label: 'Sign Out', icon: 'i-lucide-log-out', onSelect: auth.signOut }]
            ]"
          >
            <UAvatar
              :src="auth.profile?.avatar_url || undefined"
              :alt="auth.profile?.full_name || 'User'"
              size="sm"
              class="cursor-pointer"
            />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton to="/login" label="Sign In" size="sm" />
        </template>
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          © {{ new Date().getFullYear() }} Knowledge Orbit
        </p>
      </template>
      <template #right>
        <p class="text-xs text-muted">
          Posts contain affiliate links.
          <NuxtLink to="/about" class="underline underline-offset-2">Learn more</NuxtLink>
        </p>
      </template>
    </UFooter>
  </div>
</template>
