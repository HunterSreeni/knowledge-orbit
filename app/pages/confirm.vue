<script setup lang="ts">
// Supabase auth callback — handles both OAuth PKCE and email confirmation.
// For email confirmation (?type=signup), shows a welcome screen before redirecting.
// For OAuth, keeps the fast spinner + redirect.

const user = useSupabaseUser()
const router = useRouter()
const route = useRoute()

const isEmailConfirmation = computed(() =>
  route.query.type === 'signup' || route.query.type === 'email'
)

const confirmed = ref(false)
const countdown = ref(3)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startRedirect(target: string) {
  if (isEmailConfirmation.value) {
    confirmed.value = true
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer!)
        router.push(target)
      }
    }, 1000)
  } else {
    router.push(target)
  }
}

watch(user, (u) => {
  if (!u) return
  // Recovery type → go to reset-password page (session is now active)
  if (route.query.type === 'recovery') {
    startRedirect('/reset-password')
    return
  }
  const intent = import.meta.client ? sessionStorage.getItem('oauth_intent') : null
  if (import.meta.client) sessionStorage.removeItem('oauth_intent')
  startRedirect(intent === 'write' ? '/write' : '/')
}, { immediate: true })

// Fallback: if session never fires after 6 s, redirect home anyway
onMounted(() => {
  setTimeout(() => {
    if (!user.value && !confirmed.value) router.push('/login')
  }, 6000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <UContainer class="py-20 max-w-md text-center">

    <!-- ── Email confirmed welcome screen ──────────────── -->
    <Transition name="fade" mode="out-in">
      <div v-if="confirmed" key="confirmed">
        <div class="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-lucide-circle-check" class="size-10 text-sky-500" />
        </div>

        <h1 class="text-2xl font-bold mb-2">You're in!</h1>
        <p class="text-muted leading-relaxed mb-2">
          Your email is confirmed. Welcome to <span class="font-semibold text-default">Knowledge Orbit</span>.
        </p>
        <p class="text-sm text-muted/70 mb-8">
          Redirecting in {{ countdown }}s…
        </p>

        <div class="space-y-3">
          <UButton
            block
            label="Start writing"
            icon="i-lucide-pen-line"
            to="/write"
            @click="countdownTimer && clearInterval(countdownTimer)"
          />
          <UButton
            block
            label="Browse the feed"
            variant="outline"
            color="neutral"
            to="/"
            @click="countdownTimer && clearInterval(countdownTimer)"
          />
        </div>

        <div class="mt-10 pt-8 border-t border-default text-sm text-muted">
          <p class="font-medium text-default mb-3">What you can do now</p>
          <div class="space-y-2 text-left max-w-xs mx-auto">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-sky-500 shrink-0" />
              <span>Write and publish posts</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-sky-500 shrink-0" />
              <span>Like and react to stories</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-sky-500 shrink-0" />
              <span>Build your author profile</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── OAuth / generic signing in spinner ──────────── -->
      <div v-else key="loading">
        <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary mx-auto" />
        <p class="mt-4 text-muted">Signing you in…</p>
      </div>
    </Transition>

  </UContainer>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
