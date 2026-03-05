<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'
import { useAuthStore } from '~/stores/auth'
import { useSlug } from '~/composables/useSlug'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'New Post — Knowledge Orbit' })

const auth = useAuthStore()
const store = usePostsStore()
const router = useRouter()
const { toSlug } = useSlug()

const title = ref('')
const slug = ref('')
const excerpt = ref('')
const content = ref<Record<string, unknown>>({})
const coverUrl = ref('')
const tagInput = ref('')
const selectedTags = ref<{ id: number; name: string; slug: string }[]>([])
const saving = ref(false)
const error = ref('')

watch(title, (t) => { slug.value = toSlug(t) })

async function save(status: 'draft' | 'published') {
  if (!title.value.trim()) { error.value = 'Title is required'; return }
  saving.value = true
  error.value = ''
  try {
    const draft = {
      title: title.value,
      slug: slug.value,
      excerpt: excerpt.value,
      content: content.value,
      cover_image_url: coverUrl.value || null,
      series_id: null,
      reading_time_mins: Math.max(1, Math.ceil(JSON.stringify(content.value).split(' ').length / 200)),
      tag_ids: selectedTags.value.map(t => t.id)
    }
    const { slug: newSlug } = await store.createPost(draft, auth.profile!.id)
    if (status === 'published') await store.publishPost(newSlug)
    router.push(`/posts/${newSlug}`)
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Failed to save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-3xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">New Post</h1>
      <div class="flex gap-2">
        <UButton variant="outline" label="Save Draft" :loading="saving" @click="save('draft')" />
        <UButton label="Publish" :loading="saving" @click="save('published')" />
      </div>
    </div>

    <UAlert v-if="error" :title="error" color="error" variant="soft" class="mb-4" />

    <div class="space-y-4">
      <UFormField label="Title">
        <UInput v-model="title" placeholder="Your post title" size="lg" block />
      </UFormField>

      <UFormField label="Slug">
        <UInput v-model="slug" placeholder="auto-generated-slug" block />
      </UFormField>

      <UFormField label="Excerpt">
        <UTextarea v-model="excerpt" placeholder="A short description of your post…" :rows="2" block />
      </UFormField>

      <UFormField label="Cover Image URL">
        <UInput v-model="coverUrl" placeholder="https://…" block />
      </UFormField>

      <UFormField label="Content">
        <!-- TipTap editor via @nuxt/ui UEditor -->
        <UEditor v-model="content" class="min-h-96 border border-default rounded-lg" />
      </UFormField>
    </div>
  </UContainer>
</template>
