<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient()

const isNew = route.params.id === 'new'
useSeoMeta({ title: isNew ? 'New Ad — Knowledge Orbit' : 'Edit Ad — Knowledge Orbit' })

const saving = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  type: 'inline' as 'inline' | 'banner' | 'end_of_post' | 'sidebar',
  program: 'custom' as 'amazon' | 'cashkaro' | 'cred_upi' | 'custom',
  image_url: '',
  link_url: '',
  cta_text: 'Learn More',
  description: '',
  rotation_weight: 5,
  is_active: true
})

// Load existing ad for edit
if (!isNew) {
  const { data } = await useAsyncData(`ad-${route.params.id}`, async () => {
    const { data } = await client
      .from('ads')
      .select('*')
      .eq('id', route.params.id)
      .single()
    return data
  })
  if (data.value) {
    Object.assign(form, data.value)
  } else {
    throw createError({ statusCode: 404, statusMessage: 'Ad not found' })
  }
}

async function submit() {
  if (!form.name.trim() || !form.link_url.trim()) {
    error.value = 'Name and destination URL are required.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.name,
      type: form.type,
      program: form.program,
      image_url: form.image_url || null,
      link_url: form.link_url,
      cta_text: form.cta_text || 'Learn More',
      description: form.description || null,
      rotation_weight: form.rotation_weight,
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    }
    if (isNew) {
      await client.from('ads').insert(payload)
    } else {
      await client.from('ads').update(payload).eq('id', route.params.id)
    }
    router.push('/admin/ads')
  } catch (e: unknown) {
    error.value = (e as Error).message || 'Failed to save ad.'
  } finally {
    saving.value = false
  }
}

const typeOptions = [
  { label: 'Inline (between paragraphs)', value: 'inline' },
  { label: 'Banner (top of feed/tag pages)', value: 'banner' },
  { label: 'End of Post', value: 'end_of_post' },
  { label: 'Sidebar (desktop sticky)', value: 'sidebar' }
]

const programOptions = [
  { label: 'Amazon Associates', value: 'amazon' },
  { label: 'CashKaro', value: 'cashkaro' },
  { label: 'CRED UPI', value: 'cred_upi' },
  { label: 'Custom', value: 'custom' }
]
</script>

<template>
  <div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
      <UButton to="/admin/ads" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" />
      <h1 class="text-xl font-bold">{{ isNew ? 'New Ad' : 'Edit Ad' }}</h1>
    </div>

    <UAlert v-if="error" :title="error" color="error" variant="soft" class="mb-4" @close="error = ''" />

    <div class="grid gap-5">
      <div class="space-y-1.5">
        <label class="text-sm font-medium">Ad Name <span class="text-error">*</span></label>
        <UInput v-model="form.name" placeholder="e.g. Amazon Kindle Paperwhite" class="w-full" />
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Placement Type</label>
          <USelect v-model="form.type" :options="typeOptions" class="w-full" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Affiliate Program</label>
          <USelect v-model="form.program" :options="programOptions" class="w-full" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Destination URL <span class="text-error">*</span></label>
        <p class="text-xs text-muted">Amazon: use full amazon.in/amazon.com link with your Associates tag.</p>
        <UInput v-model="form.link_url" placeholder="https://..." class="w-full" />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Image URL</label>
        <UInput v-model="form.image_url" placeholder="https://..." class="w-full" />
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">CTA Button Text</label>
          <UInput v-model="form.cta_text" placeholder="Learn More" class="w-full" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Rotation Weight ({{ form.rotation_weight }}/10)</label>
          <p class="text-xs text-muted">1 = rarely shown, 10 = shown most often</p>
          <input
            v-model.number="form.rotation_weight"
            type="range"
            min="1"
            max="10"
            class="w-full accent-sky-500"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Short Description</label>
        <UTextarea v-model="form.description" :rows="2" placeholder="Brief pitch shown in the ad card" class="w-full" />
      </div>

      <div class="flex items-center gap-3">
        <UToggle v-model="form.is_active" />
        <span class="text-sm">{{ form.is_active ? 'Active — shown to visitors' : 'Inactive — hidden' }}</span>
      </div>

      <!-- Preview -->
      <div v-if="form.name || form.image_url" class="border border-dashed border-sky-500/30 rounded-xl p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Preview (Inline style)</p>
        <div class="flex items-start gap-3">
          <img
            v-if="form.image_url"
            :src="form.image_url"
            alt="Ad preview"
            class="w-16 h-16 rounded-lg object-cover shrink-0"
          />
          <div>
            <span class="text-xs bg-muted/20 text-muted px-1.5 py-0.5 rounded uppercase tracking-wide font-medium">Sponsored</span>
            <p class="font-medium text-sm mt-1">{{ form.name || 'Ad name' }}</p>
            <p v-if="form.description" class="text-xs text-muted mt-0.5">{{ form.description }}</p>
            <p class="text-xs text-sky-500 mt-1">{{ form.cta_text || 'Learn More' }} →</p>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <UButton
          :label="isNew ? 'Create Ad' : 'Save Changes'"
          :loading="saving"
          @click="submit"
        />
        <UButton to="/admin/ads" label="Cancel" variant="outline" color="neutral" />
      </div>
    </div>
  </div>
</template>
