<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Sign In — Knowledge Orbit' })

const auth = useAuthStore()
const user = useSupabaseUser()

// Redirect if already logged in — onMounted so it only runs client-side
onMounted(() => {
  if (user.value) navigateTo('/')
})

// Also watch in case auth resolves after mount
watch(user, (u) => {
  if (u) navigateTo('/')
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const mode = ref<'signin' | 'signup'>('signin')

async function handleEmail() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'signup') {
      await auth.signUp(email.value, password.value)
      error.value = 'Check your email to confirm your account.'
    } else {
      await auth.signInWithEmail(email.value, password.value)
      await navigateTo('/')
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Header -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="text-2xl font-bold text-primary">Knowledge Orbit</NuxtLink>
        <h1 class="text-xl font-semibold mt-3">
          {{ mode === 'signin' ? 'Welcome back' : 'Create your account' }}
        </h1>
        <p class="text-muted text-sm mt-1">
          {{ mode === 'signin' ? 'Sign in to your account' : 'Join the community' }}
        </p>
      </div>

      <!-- OAuth buttons -->
      <div class="space-y-3 mb-6">
        <UButton
          block
          size="md"
          icon="i-simple-icons-google"
          label="Continue with Google"
          color="neutral"
          variant="outline"
          class="w-full justify-center"
          @click="auth.signInWithGoogle()"
        />
        <UButton
          block
          size="md"
          icon="i-simple-icons-github"
          label="Continue with GitHub"
          color="neutral"
          variant="outline"
          class="w-full justify-center"
          @click="auth.signInWithGitHub()"
        />
        <UButton
          block
          size="md"
          icon="i-simple-icons-linkedin"
          label="Continue with LinkedIn"
          color="neutral"
          variant="outline"
          class="w-full justify-center"
          @click="auth.signInWithLinkedIn()"
        />
      </div>

      <USeparator label="or continue with email" class="my-6" />

      <!-- Email form -->
      <form class="space-y-4" @submit.prevent="handleEmail">
        <div class="space-y-1">
          <label class="text-sm font-medium">Email</label>
          <UInput
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            size="md"
            class="w-full"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">Password</label>
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            size="md"
            class="w-full"
          />
        </div>

        <UAlert
          v-if="error"
          :title="error"
          :color="error.includes('email') ? 'info' : 'error'"
          variant="soft"
          class="text-sm"
        />

        <UButton
          type="submit"
          block
          size="md"
          :loading="loading"
          :label="mode === 'signin' ? 'Sign In' : 'Create Account'"
          class="w-full"
        />
      </form>

      <p class="text-center text-sm text-muted mt-6">
        <template v-if="mode === 'signin'">
          No account?
          <button class="text-primary underline underline-offset-2 font-medium" @click="mode = 'signup'">
            Sign up free
          </button>
        </template>
        <template v-else>
          Already have an account?
          <button class="text-primary underline underline-offset-2 font-medium" @click="mode = 'signin'">
            Sign in
          </button>
        </template>
      </p>
    </div>
  </div>
</template>
