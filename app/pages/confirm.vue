<script setup lang="ts">
// OAuth PKCE callback — @nuxtjs/supabase handles token exchange automatically
const router = useRouter()
onMounted(() => router.push('/'))
</script>

<template>
  <UContainer class="py-20 text-center">
    <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary mx-auto" />
    <p class="mt-4 text-muted">Signing you in…</p>
  </UContainer>
</template>
