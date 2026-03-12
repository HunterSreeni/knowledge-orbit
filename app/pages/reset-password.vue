<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Reset Password — Knowledge Orbit' })

const auth = useAuthStore()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

// ── State ─────────────────────────────────────────────────────
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)
const ready = ref(false)   // true once we confirm a recovery session exists

// ── Wait for the recovery session ─────────────────────────────
// @supabase/ssr's createBrowserClient is configured with detectSessionInUrl: true
// and flowType: 'pkce', so it auto-exchanges the ?code= param on client init.
// We must NOT call exchangeCodeForSession ourselves — the code is single-use and
// calling it a second time causes it to fail, sending users to the expired page.
//
// Strategy:
// 1. If ?code= is in the URL, clean it with history.replaceState (no Vue Router
//    navigation = no component remount = reactive state is preserved).
// 2. Wait for useSupabaseUser() to become non-null (the auto-exchange fires
//    onAuthStateChange → module updates useSupabaseUser).
// 3. If user never appears within 8 s, the token was expired/invalid → redirect.
onMounted(() => {
  if (route.query.code && import.meta.client) {
    // Clean URL without triggering a router navigation (which would remount the page)
    window.history.replaceState({}, '', '/reset-password')
  }

  // Already in a recovery session (e.g. arrived from /confirm)
  if (user.value) { ready.value = true; return }

  const timeout = setTimeout(() => {
    if (!user.value) router.replace('/reset-link-expired')
  }, 8000)

  const stop = watch(user, (u) => {
    if (u) {
      ready.value = true
      clearTimeout(timeout)
      stop()
    }
  })
})

// ── Submit new password ────────────────────────────────────────
async function handleReset() {
  error.value = ''
  if (!password.value) { error.value = 'Please enter a new password.'; return }
  if (password.value.length < 6) { error.value = 'Password must be at least 6 characters.'; return }
  if (password.value !== confirmPassword.value) { error.value = 'Passwords do not match.'; return }

  loading.value = true
  try {
    await auth.updatePassword(password.value)
    done.value = true
    // Sign out so they do a clean login with the new password
    setTimeout(async () => {
      await auth.signOut()
    }, 3000)
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('Password should be at least')) error.value = 'Password must be at least 6 characters.'
    else if (msg.includes('same password')) error.value = 'New password must be different from your current password.'
    else error.value = msg || 'Something went wrong. Please request a new reset link.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">

      <!-- Success state -->
      <div v-if="done" class="text-center">
        <div class="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <UIcon name="i-lucide-check-circle" class="size-8 text-emerald-500" />
        </div>
        <h1 class="text-xl font-bold mb-2">Password updated!</h1>
        <p class="text-sm text-muted mb-6">Signing you out so you can log in fresh with your new password…</p>
        <UButton to="/login" label="Go to sign in" icon="i-lucide-arrow-right" trailing block />
      </div>

      <!-- Loading — waiting for token exchange -->
      <div v-else-if="!ready" class="text-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary mx-auto mb-4" />
        <p class="text-sm text-muted">Verifying your reset link…</p>
      </div>

      <!-- Set new password form -->
      <div v-else>
        <div class="text-center mb-8">
          <NuxtLink to="/" class="text-2xl font-bold text-primary">Knowledge Orbit</NuxtLink>
          <h1 class="text-xl font-semibold mt-3">Set a new password</h1>
          <p class="text-muted text-sm mt-1">Choose something strong and memorable</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleReset">
          <div class="space-y-1">
            <label class="text-sm font-medium">New password</label>
            <UInput
              v-model="password"
              type="password"
              placeholder="Min 6 characters"
              size="md"
              class="w-full"
              autocomplete="new-password"
              autofocus
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium">Confirm password</label>
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              size="md"
              class="w-full"
              autocomplete="new-password"
            />
          </div>

          <UAlert v-if="error" :title="error" color="error" variant="soft" class="text-sm" icon="i-lucide-alert-circle" />

          <UButton type="submit" block size="md" :loading="loading" label="Update password" icon="i-lucide-lock" class="w-full" />
        </form>
      </div>

    </div>
  </div>
</template>
