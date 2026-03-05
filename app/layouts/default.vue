<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const user = useSupabaseUser()

// Watch user state and keep profile in sync — runs client-side only
watch(user, async (u) => {
  if (u) await auth.fetchProfile(u.id)
  else auth.profile = null
}, { immediate: true })

const isAuthed = computed(() => !!user.value)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="font-bold text-lg text-primary tracking-tight">
          Knowledge Orbit
        </NuxtLink>
      </template>

      <template #right>
        <UButton
          to="/search"
          icon="i-lucide-search"
          variant="ghost"
          color="neutral"
          aria-label="Search"
          class="hidden sm:flex"
        />
        <UColorModeButton />

        <template v-if="isAuthed">
          <UButton
            to="/write"
            icon="i-lucide-pen-line"
            variant="ghost"
            color="neutral"
            aria-label="Write"
            class="hidden sm:flex"
          />
          <UDropdownMenu
            :items="[
              [{ label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-layout-dashboard' }],
              ...(auth.isAdmin ? [[{ label: 'Admin Panel', to: '/admin', icon: 'i-lucide-shield' }]] : []),
              [{ label: 'Sign Out', icon: 'i-lucide-log-out', onSelect: () => auth.signOut() }]
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
        <p class="text-xs text-muted hidden sm:block">
          Posts may contain affiliate links.
        </p>
      </template>
    </UFooter>
  </div>
</template>
