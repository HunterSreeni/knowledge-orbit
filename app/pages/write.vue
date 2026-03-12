<script setup lang="ts">
import { usePostsStore } from '~/stores/posts'
import { useSlug } from '~/composables/useSlug'

definePageMeta({ middleware: 'auth', layout: false })
useSeoMeta({ title: 'Write — Knowledge Orbit' })

const store = usePostsStore()
const router = useRouter()
const { toSlug } = useSlug()

// ── Step 1: editor ──────────────────────────────────────
const title = ref('')
const content = ref<Record<string, unknown> | null>(null)
const titleEl = ref<HTMLTextAreaElement | null>(null)

// ── Step 2: publish panel ────────────────────────────────
const showPublish = ref(false)
const summary = ref('')
const coverUrl = ref('')
const coverError = ref(false)
const tagInput = ref('')
const selectedTags = ref<{ id: number; name: string; slug: string }[]>([])

const saving = ref(false)
const error = ref('')

const slug = computed(() => toSlug(title.value))

function autoResize() {
  const el = titleEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function addTag() {
  const name = tagInput.value.trim()
  if (!name || selectedTags.value.some(t => t.name === name)) {
    tagInput.value = ''
    return
  }
  selectedTags.value.push({ id: Date.now(), name, slug: toSlug(name) })
  tagInput.value = ''
}

function removeTag(id: number) {
  selectedTags.value = selectedTags.value.filter(t => t.id !== id)
}

async function resolveTagIds(client: ReturnType<typeof useSupabaseClient>): Promise<number[]> {
  const ids: number[] = []
  for (const tag of selectedTags.value) {
    if (tag.id < 1_700_000_000_000) {
      ids.push(tag.id)
    } else {
      try {
        const { data } = await client
          .from('tags')
          .upsert({ name: tag.name, slug: tag.slug }, { onConflict: 'slug' })
          .select('id')
          .single()
        if (data?.id) ids.push(data.id)
      } catch { /* skip tag if RLS or constraint prevents it */ }
    }
  }
  return ids
}

async function save(status: 'draft' | 'published') {
  const client = useSupabaseClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user?.id) {
    error.value = 'Not signed in. Please refresh and try again.'
    return
  }
  if (!title.value.trim()) {
    error.value = 'A title is required.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const wordLen = JSON.stringify(content.value ?? {}).split(' ').length
    const draft = {
      title: title.value,
      slug: slug.value,
      excerpt: summary.value,
      content: content.value,
      cover_image_url: coverUrl.value || null,
      series_id: null,
      reading_time_mins: Math.max(1, Math.ceil(wordLen / 200)),
      tag_ids: await resolveTagIds(client)
    }
    const { id: newId, slug: newSlug } = await store.createPost(draft, user.id)
    if (status === 'published') {
      await store.publishPost(newId)
      router.push(`/posts/${newSlug}`)
    } else {
      router.push('/dashboard')
    }
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Failed to save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-default">

    <!-- ── Top bar ─────────────────────────────────────── -->
    <header class="h-14 shrink-0 border-b border-default flex items-center justify-between px-4 bg-default z-10">
      <div class="flex items-center gap-2">
        <UButton
          to="/dashboard"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Back"
        />
        <span class="text-sm text-muted hidden sm:block">New Story</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          label="Save Draft"
          :loading="saving"
          @click="save('draft')"
        />
        <UButton
          size="sm"
          label="Continue"
          trailing-icon="i-lucide-arrow-right"
          :disabled="!title.trim()"
          @click="showPublish = true"
        />
      </div>
    </header>

    <!-- ── Editor (Step 1) ────────────────────────────── -->
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-2xl mx-auto px-6 sm:px-10 pt-12 pb-40">

        <UAlert
          v-if="error"
          :title="error"
          color="error"
          variant="soft"
          class="mb-6"
          @close="error = ''"
        />

        <!-- Title -->
        <textarea
          ref="titleEl"
          v-model="title"
          placeholder="Title"
          rows="1"
          class="w-full resize-none bg-transparent text-4xl sm:text-5xl font-bold focus:outline-none leading-tight placeholder:text-muted/25 text-default mb-6"
          @input="autoResize"
        />

        <!-- Markdown shortcuts hint -->
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 mb-6 text-xs text-muted/60 select-none">
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted"># </kbd> Heading</span>
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted">**bold**</kbd></span>
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted">_italic_</kbd></span>
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted">- </kbd> List</span>
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted">> </kbd> Quote</span>
          <span><kbd class="font-mono bg-elevated px-1 py-0.5 rounded text-muted">`code`</kbd></span>
        </div>

        <!-- Rich text editor -->
        <UEditor
          v-model="content"
          class="
            [&_.tiptap]:min-h-[55vh]
            [&_.tiptap]:focus:outline-none
            [&_.tiptap]:text-lg
            [&_.tiptap]:leading-[1.8]
            [&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mt-8 [&_.tiptap_h1]:mb-3
            [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:mt-6 [&_.tiptap_h2]:mb-2
            [&_.tiptap_h3]:text-xl  [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:mb-2
            [&_.tiptap_p]:mb-4
            [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-sky-500/50 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:text-muted [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:my-4
            [&_.tiptap_code]:bg-elevated [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono
            [&_.tiptap_pre]:bg-elevated [&_.tiptap_pre]:p-4 [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre]:my-4
            [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:mb-4
            [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:mb-4
            [&_.tiptap_li]:mb-1
          "
        />
      </div>
    </div>

    <!-- ── Step 2: Publish panel ───────────────────────── -->
    <Transition name="fade">
      <div
        v-if="showPublish"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 bg-black/50 backdrop-blur-sm"
        @click.self="showPublish = false"
      >
        <div class="w-full sm:max-w-2xl bg-default border border-default rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          <!-- Panel header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-default">
            <div>
              <h2 class="font-semibold">Ready to publish?</h2>
              <p class="text-xs text-muted mt-0.5">Review how your story looks, then publish or save as draft</p>
            </div>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              aria-label="Close"
              @click="showPublish = false"
            />
          </div>

          <!-- Panel body -->
          <div class="p-6 grid sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">

            <!-- Story preview card -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Story preview</p>
              <div class="rounded-xl border border-default overflow-hidden">
                <div class="h-36 bg-elevated flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    v-if="coverUrl && !coverError"
                    :src="coverUrl"
                    alt="Cover preview"
                    class="w-full h-full object-cover"
                    @error="coverError = true"
                  />
                  <div v-else class="flex flex-col items-center gap-2 text-muted/40">
                    <UIcon :name="coverError ? 'i-lucide-image-off' : 'i-lucide-image'" class="size-8" />
                    <span class="text-xs">{{ coverError ? 'Cannot load image' : 'No cover image' }}</span>
                  </div>
                </div>
                <div class="p-4">
                  <p class="font-bold text-sm line-clamp-2">{{ title || 'Your title will appear here' }}</p>
                  <p class="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                    {{ summary || 'Add a short description to the right...' }}
                  </p>
                </div>
              </div>
              <p class="text-xs text-muted mt-3 leading-relaxed">
                These changes affect only the card preview, not the story content.
              </p>
            </div>

            <!-- Settings -->
            <div class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Cover image URL</label>
                <UInput
                  v-model="coverUrl"
                  placeholder="https://i.imgur.com/xxxxx.jpg"
                  class="w-full"
                  @input="coverError = false"
                />
                <p class="text-xs text-muted">Use a direct image URL, not a gallery or page link.</p>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium">Short description</label>
                <p class="text-xs text-muted">Shown in post cards and search results.</p>
                <UTextarea
                  v-model="summary"
                  :rows="3"
                  placeholder="What is this story about?"
                  class="w-full"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium">Tags</label>
                <UInput
                  v-model="tagInput"
                  placeholder="Type a tag, press Enter"
                  class="w-full"
                  @keydown.enter.prevent="addTag"
                  @keydown.188.prevent="addTag"
                />
                <div v-if="selectedTags.length" class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="tag in selectedTags"
                    :key="tag.id"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium cursor-pointer hover:bg-sky-500/20 transition-colors"
                    @click="removeTag(tag.id)"
                  >
                    {{ tag.name }}
                    <UIcon name="i-lucide-x" class="size-3 opacity-70" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-default bg-elevated/40">
            <UButton
              variant="ghost"
              color="neutral"
              label="Save as draft"
              :loading="saving"
              @click="save('draft')"
            />
            <UButton
              label="Publish now"
              trailing-icon="i-lucide-send"
              :loading="saving"
              @click="save('published')"
            />
          </div>

        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
