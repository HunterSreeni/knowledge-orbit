<script setup lang="ts">
import { useSlug } from '~/composables/useSlug'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Admin Tags — Knowledge Orbit' })

const client = useSupabaseClient()
const { toSlug } = useSlug()
const tags = ref<{ id: number; name: string; slug: string }[]>([])
const newName = ref('')
const saving = ref(false)

onMounted(async () => {
  const { data } = await client.from('tags').select('*').order('name')
  tags.value = data ?? []
})

async function create() {
  if (!newName.value.trim()) return
  saving.value = true
  const { data } = await client.from('tags')
    .insert({ name: newName.value.trim(), slug: toSlug(newName.value) })
    .select().single()
  if (data) tags.value.push(data)
  newName.value = ''
  saving.value = false
}

async function remove(id: number) {
  if (!confirm('Delete tag?')) return
  await client.from('tags').delete().eq('id', id)
  tags.value = tags.value.filter(t => t.id !== id)
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-6">Tags</h1>

    <div class="flex gap-2 mb-6">
      <UInput v-model="newName" placeholder="New tag name" class="flex-1" @keyup.enter="create" />
      <UButton label="Add Tag" :loading="saving" @click="create" />
    </div>

    <div class="space-y-2">
      <div
        v-for="tag in tags" :key="tag.id"
        class="flex items-center justify-between p-3 border border-default rounded-lg"
      >
        <div>
          <span class="font-medium">{{ tag.name }}</span>
          <span class="text-muted text-xs ml-2">{{ tag.slug }}</span>
        </div>
        <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="remove(tag.id)" />
      </div>
    </div>
  </div>
</template>
