<script setup lang="ts">
const email = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

async function subscribe() {
  if (!email.value.trim()) return
  status.value = 'loading'
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value.trim() }
    })
    status.value = 'success'
    email.value = ''
  } catch {
    status.value = 'error'
  }
}
</script>

<template>
  <div class="mt-12 p-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 text-center">
    <UIcon name="i-lucide-mail" class="size-8 text-sky-500 mx-auto mb-3" />
    <h3 class="font-semibold text-lg mb-1">Stay in the orbit</h3>
    <p class="text-sm text-muted mb-4">
      Get new posts delivered to your inbox. No spam, unsubscribe anytime.
    </p>

    <div v-if="status === 'success'" class="text-sm text-green-600 dark:text-green-400 font-medium">
      You're subscribed! Welcome aboard.
    </div>

    <form v-else class="flex gap-2 max-w-sm mx-auto" @submit.prevent="subscribe">
      <UInput
        v-model="email"
        type="email"
        placeholder="you@example.com"
        class="flex-1"
        required
      />
      <UButton
        type="submit"
        label="Subscribe"
        :loading="status === 'loading'"
      />
    </form>

    <p v-if="status === 'error'" class="text-sm text-red-500 mt-2">
      Something went wrong. Please try again.
    </p>
  </div>
</template>
