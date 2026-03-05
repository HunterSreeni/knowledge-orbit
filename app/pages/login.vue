<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Sign In — Knowledge Orbit' })

const auth = useAuthStore()
const user = useSupabaseUser()
const router = useRouter()

if (user.value) router.push('/')

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
      router.push('/')
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="py-16 max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold">{{ mode === 'signin' ? 'Welcome back' : 'Create account' }}</h1>
      <p class="text-muted mt-1 text-sm">Knowledge Orbit</p>
    </div>

    <div class="space-y-3 mb-6">
      <UButton block icon="i-simple-icons-google" label="Continue with Google"
        color="neutral" variant="outline" @click="auth.signInWithGoogle()" />
      <UButton block icon="i-simple-icons-github" label="Continue with GitHub"
        color="neutral" variant="outline" @click="auth.signInWithGitHub()" />
      <UButton block icon="i-simple-icons-linkedin" label="Continue with LinkedIn"
        color="neutral" variant="outline" @click="auth.signInWithLinkedIn()" />
    </div>

    <USeparator label="or" class="my-6" />

    <UForm class="space-y-4" @submit.prevent="handleEmail">
      <UFormField label="Email">
        <UInput v-model="email" type="email" placeholder="you@example.com" required block />
      </UFormField>
      <UFormField label="Password">
        <UInput v-model="password" type="password" placeholder="••••••••" required block />
      </UFormField>

      <UAlert v-if="error" :title="error" color="error" variant="soft" />

      <UButton type="submit" block :loading="loading"
        :label="mode === 'signin' ? 'Sign In' : 'Create Account'" />
    </UForm>

    <p class="text-center text-sm text-muted mt-6">
      <template v-if="mode === 'signin'">
        No account?
        <button class="text-primary underline" @click="mode = 'signup'">Sign up</button>
      </template>
      <template v-else>
        Have an account?
        <button class="text-primary underline" @click="mode = 'signin'">Sign in</button>
      </template>
    </p>
  </UContainer>
</template>
