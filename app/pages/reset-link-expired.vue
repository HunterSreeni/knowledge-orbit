<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Reset Link Expired — Knowledge Orbit' })

const auth = useAuthStore()

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function handleResend() {
  error.value = ''
  if (!email.value.trim()) { error.value = 'Please enter your email address.'; return }
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value.trim())
    sent.value = true
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (msg.includes('rate limit') || msg.includes('too many')) {
      error.value = 'Too many attempts. Please wait a moment and try again.'
    } else {
      // Don't reveal whether the email exists — always show success
      sent.value = true
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm text-center">

      <!-- Sent confirmation -->
      <div v-if="sent">
        <div class="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-lucide-mail" class="size-10 text-sky-500" />
        </div>
        <h1 class="text-2xl font-bold mb-3">Check your inbox</h1>
        <p class="text-sm text-muted leading-relaxed mb-2">
          If an account exists for
        </p>
        <p class="font-semibold text-sm mb-4 break-all">{{ email }}</p>
        <p class="text-sm text-muted leading-relaxed mb-8">
          you'll receive a new password reset link shortly. Check your spam folder too.
        </p>
        <UButton
          to="/login"
          block
          size="md"
          variant="outline"
          color="neutral"
          icon="i-lucide-log-in"
          label="Back to login"
        />
      </div>

      <!-- Expired form -->
      <div v-else>
        <div class="size-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-lucide-clock-alert" class="size-10 text-rose-500" />
        </div>

        <h1 class="text-2xl font-bold mb-3">Reset link expired</h1>
        <p class="text-sm text-muted leading-relaxed mb-8">
          Password reset links are only valid for <strong class="text-default">1 hour</strong>.
          Enter your email to receive a fresh one.
        </p>

        <form class="space-y-3 text-left" @submit.prevent="handleResend">
          <div class="space-y-1">
            <label class="text-sm font-medium">Email address</label>
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              size="md"
              class="w-full"
              autocomplete="email"
              autofocus
            />
          </div>

          <UAlert
            v-if="error"
            :title="error"
            color="error"
            variant="soft"
            class="text-sm"
            icon="i-lucide-alert-circle"
          />

          <UButton
            type="submit"
            block
            size="md"
            icon="i-lucide-refresh-cw"
            label="Send new reset link"
            :loading="loading"
            class="w-full"
          />
        </form>

        <div class="mt-4">
          <UButton
            to="/login"
            block
            size="md"
            variant="outline"
            color="neutral"
            icon="i-lucide-log-in"
            label="Back to login"
          />
        </div>
      </div>

    </div>
  </div>
</template>
