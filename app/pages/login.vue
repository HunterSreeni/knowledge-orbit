<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default', middleware: 'guest' })
useSeoMeta({ title: 'Sign In — Knowledge Orbit' })

const auth = useAuthStore()
const user = useSupabaseUser()
const route = useRoute()

// ── State ────────────────────────────────────────────────────
const email = ref('')
const password = ref('')
const loading = ref(false)
const oauthLoading = ref<string | null>(null)
const error = ref('')
const mode = ref<'signin' | 'signup' | 'forgot'>('signin')
const linkExpiredBanner = ref(false)

// Confirmation / resend flow
const pendingEmail = ref<string | null>(null)
const resendLoading = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Forgot password flow
const forgotSent = ref(false)

// ── Redirect helpers ─────────────────────────────────────────
function redirectTarget() {
  return route.query.intent === 'write' ? '/write' : '/'
}

// ── On mount: check hash for Supabase error params ───────────
onMounted(() => {
  if (user.value) { navigateTo(redirectTarget()); return }

  // Supabase puts auth errors in the URL hash fragment (#error=...&error_code=...)
  // Came from reset-password expired link page
  if (route.query.reset === '1') { mode.value = 'forgot'; return }

  // Supabase puts auth errors in the URL hash fragment (#error=...&error_code=...)
  const hash = window.location.hash.slice(1)
  const params = new URLSearchParams(hash)
  const errorCode = params.get('error_code')
  if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
    linkExpiredBanner.value = true
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
})

watch(user, (u) => { if (u) navigateTo(redirectTarget()) })

// ── Cooldown timer ───────────────────────────────────────────
function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

// ── Error mapping ────────────────────────────────────────────
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.'
  if (msg.includes('Email not confirmed')) return ''   // handled below — shows resend screen
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try signing in instead.'
  if (msg.includes('Password should be at least')) return 'Password must be at least 6 characters.'
  if (msg.includes('signup_disabled')) return 'Sign-ups are currently disabled. Please try again later.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Connection error. Check your internet and try again.'
  return msg || 'Something went wrong. Please try again.'
}

// ── OAuth ────────────────────────────────────────────────────
async function handleOAuth(provider: 'google' | 'github' | 'linkedin') {
  oauthLoading.value = provider
  error.value = ''
  if (route.query.intent) sessionStorage.setItem('oauth_intent', route.query.intent as string)
  try {
    if (provider === 'google') await auth.signInWithGoogle()
    else if (provider === 'github') await auth.signInWithGitHub()
    else await auth.signInWithLinkedIn()
  } catch (e: unknown) {
    error.value = friendlyError((e as Error).message)
    oauthLoading.value = null
  }
}

// ── Email submit ─────────────────────────────────────────────
async function handleEmail() {
  error.value = ''
  if (!email.value.trim()) { error.value = 'Please enter your email.'; return }
  if (!password.value && !linkExpiredBanner.value) { error.value = 'Please enter your password.'; return }
  loading.value = true
  try {
    if (linkExpiredBanner.value) {
      // Resend confirmation — no password needed
      await auth.resendConfirmation(email.value)
      pendingEmail.value = email.value
      startCooldown()
    } else if (mode.value === 'signup') {
      await auth.signUp(email.value, password.value)
      pendingEmail.value = email.value
      startCooldown()
    } else {
      await auth.signInWithEmail(email.value, password.value)
      await navigateTo(redirectTarget())
    }
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('Email not confirmed')) {
      // Auto-show the resend screen — much better than a static error
      pendingEmail.value = email.value
      startCooldown()
    } else {
      error.value = friendlyError(msg)
    }
  } finally {
    loading.value = false
  }
}

// ── Resend ───────────────────────────────────────────────────
async function handleResend() {
  if (!pendingEmail.value || resendCooldown.value > 0) return
  resendLoading.value = true
  error.value = ''
  try {
    await auth.resendConfirmation(pendingEmail.value)
    startCooldown()
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Failed to resend. Please try again.'
  } finally {
    resendLoading.value = false
  }
}

function backToSignup() {
  pendingEmail.value = null
  error.value = ''
  mode.value = 'signup'
  linkExpiredBanner.value = false
}

function switchMode(m: 'signin' | 'signup' | 'forgot') {
  mode.value = m
  error.value = ''
  pendingEmail.value = null
  linkExpiredBanner.value = false
  forgotSent.value = false
}

// ── Computed screen key — drives the single Transition child ──
const currentScreen = computed(() => {
  if (pendingEmail.value) return 'confirm'
  if (mode.value === 'forgot' && forgotSent.value) return 'forgot-sent'
  if (mode.value === 'forgot') return 'forgot'
  return 'form'
})

// ── Forgot password ───────────────────────────────────────────
async function handleForgot() {
  error.value = ''
  if (!email.value.trim()) { error.value = 'Please enter your email address.'; return }
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value)
    forgotSent.value = true
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('rate limit') || msg.includes('too many')) {
      error.value = 'Too many attempts. Please wait a moment and try again.'
    } else {
      // Don't reveal whether email exists — always show success
      forgotSent.value = true
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">

      <Transition name="fade-up" mode="out-in">
        <div :key="currentScreen">

          <!-- ── Email sent: signup confirmation ──────────────── -->
          <template v-if="currentScreen === 'confirm'">
            <div class="text-center">
              <div class="size-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-5">
                <UIcon name="i-lucide-mail-check" class="size-8 text-sky-500" />
              </div>
              <h1 class="text-xl font-bold mb-2">Check your inbox</h1>
              <p class="text-sm text-muted mb-1">We sent a confirmation link to</p>
              <p class="font-semibold text-sm mb-6 break-all">{{ pendingEmail }}</p>
              <div class="p-4 rounded-xl border border-default bg-elevated/40 text-left text-sm text-muted space-y-2 mb-6">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-circle-1" class="size-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>Open the email from <strong class="text-default">Knowledge Orbit</strong></span>
                </div>
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-circle-2" class="size-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>Click <strong class="text-default">Confirm your email</strong></span>
                </div>
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-circle-3" class="size-4 text-sky-500 shrink-0 mt-0.5" />
                  <span>Come back here and sign in to start writing</span>
                </div>
              </div>
              <UAlert v-if="error" :title="error" color="error" variant="soft" class="text-sm mb-4" icon="i-lucide-alert-circle" />
              <UButton
                block size="md" variant="outline" color="neutral" icon="i-lucide-refresh-cw" class="mb-3"
                :loading="resendLoading" :disabled="resendCooldown > 0"
                :label="resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend confirmation email'"
                @click="handleResend"
              />
              <div class="flex gap-3 justify-center text-sm mt-4">
                <button class="text-muted hover:text-default underline underline-offset-2" @click="backToSignup">Use a different email</button>
                <span class="text-muted/40">·</span>
                <button class="text-primary underline underline-offset-2 font-medium" @click="switchMode('signin')">Already confirmed? Sign in</button>
              </div>
            </div>
          </template>

          <!-- ── Forgot password: reset link sent ─────────────── -->
          <template v-else-if="currentScreen === 'forgot-sent'">
            <div class="text-center">
              <div class="size-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-5">
                <UIcon name="i-lucide-mail" class="size-8 text-sky-500" />
              </div>
              <h1 class="text-xl font-bold mb-2">Check your inbox</h1>
              <p class="text-sm text-muted mb-1">If an account exists for</p>
              <p class="font-semibold text-sm mb-4 break-all">{{ email }}</p>
              <p class="text-sm text-muted mb-8">you'll receive a password reset link shortly. Check your spam folder too.</p>
              <UButton block variant="outline" color="neutral" label="Back to sign in" icon="i-lucide-arrow-left" @click="switchMode('signin')" />
            </div>
          </template>

          <!-- ── Forgot password: email input ─────────────────── -->
          <template v-else-if="currentScreen === 'forgot'">
            <div class="text-center mb-8">
              <NuxtLink to="/" class="text-2xl font-bold text-primary">Knowledge Orbit</NuxtLink>
              <h1 class="text-xl font-semibold mt-3">Reset your password</h1>
              <p class="text-muted text-sm mt-1">We'll send a reset link to your inbox</p>
            </div>
            <form class="space-y-4" @submit.prevent="handleForgot">
              <div class="space-y-1">
                <label class="text-sm font-medium">Email</label>
                <UInput v-model="email" type="email" placeholder="you@example.com" required size="md" class="w-full" autocomplete="email" />
              </div>
              <UAlert v-if="error" :title="error" color="error" variant="soft" class="text-sm" icon="i-lucide-alert-circle" />
              <UButton type="submit" block size="md" :loading="loading" label="Send reset link" icon="i-lucide-send" class="w-full" />
            </form>
            <p class="text-center text-sm text-muted mt-6">
              <button class="text-primary underline underline-offset-2 font-medium" @click="switchMode('signin')">Back to sign in</button>
            </p>
          </template>

          <!-- ── Sign-in / Sign-up form ───────────────────────── -->
          <template v-else>
            <div class="text-center mb-8">
              <NuxtLink to="/" class="text-2xl font-bold text-primary">Knowledge Orbit</NuxtLink>
              <h1 class="text-xl font-semibold mt-3">
                {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
              </h1>
              <p class="text-muted text-sm mt-1">
                {{ mode === 'signin'
                  ? (route.query.intent === 'write' ? 'Sign in to start writing' : 'Sign in to continue')
                  : 'Join the community for free — no credit card' }}
              </p>
            </div>

            <UAlert
              v-if="linkExpiredBanner"
              title="Your confirmation link has expired."
              description="Enter your email below and click 'Send new link' to get a fresh one."
              color="warning" variant="soft" class="mb-5" icon="i-lucide-clock-alert"
            />

            <template v-if="!linkExpiredBanner">
              <div class="space-y-2.5 mb-6">
                <UButton block size="md" icon="i-simple-icons-google" label="Continue with Google"
                  color="neutral" variant="outline" class="w-full justify-center"
                  :loading="oauthLoading === 'google'" :disabled="!!oauthLoading" @click="handleOAuth('google')" />
                <UButton block size="md" icon="i-simple-icons-github" label="Continue with GitHub"
                  color="neutral" variant="outline" class="w-full justify-center"
                  :loading="oauthLoading === 'github'" :disabled="!!oauthLoading" @click="handleOAuth('github')" />
                <UButton block size="md" icon="i-simple-icons-linkedin" label="Continue with LinkedIn"
                  color="neutral" variant="outline" class="w-full justify-center"
                  :loading="oauthLoading === 'linkedin'" :disabled="!!oauthLoading" @click="handleOAuth('linkedin')" />
              </div>
              <USeparator label="or continue with email" class="my-5" />
            </template>

            <form class="space-y-4" @submit.prevent="handleEmail">
              <div class="space-y-1">
                <label class="text-sm font-medium">Email</label>
                <UInput v-model="email" type="email" placeholder="you@example.com" required size="md" class="w-full" autocomplete="email" />
              </div>
              <div v-if="!linkExpiredBanner" class="space-y-1">
                <label class="text-sm font-medium">Password</label>
                <UInput v-model="password" type="password" placeholder="••••••••" size="md" class="w-full"
                  :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" />
                <p v-if="mode === 'signup'" class="text-xs text-muted mt-1">At least 6 characters</p>
              </div>
              <UAlert v-if="error" :title="error" color="error" variant="soft" class="text-sm" icon="i-lucide-alert-circle" />
              <UButton type="submit" block size="md" :loading="loading" class="w-full"
                :label="linkExpiredBanner ? 'Send new link' : mode === 'signin' ? 'Sign In' : 'Create Account'" />
            </form>

            <!-- Forgot password link — standalone below form, easy to click -->
            <p v-if="mode === 'signin' && !linkExpiredBanner" class="text-center text-sm mt-3">
              <button type="button" class="text-muted hover:text-primary underline underline-offset-2 transition-colors" @click="switchMode('forgot')">
                Forgot your password?
              </button>
            </p>

            <p class="text-center text-sm text-muted mt-4">
              <template v-if="mode === 'signin'">
                No account?
                <button type="button" class="text-primary underline underline-offset-2 font-medium" @click="switchMode('signup')">Sign up free</button>
              </template>
              <template v-else>
                Already have an account?
                <button type="button" class="text-primary underline underline-offset-2 font-medium" @click="switchMode('signin')">Sign in</button>
              </template>
            </p>
          </template>

        </div>
      </Transition>

    </div>
  </div>

</template>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.2s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
