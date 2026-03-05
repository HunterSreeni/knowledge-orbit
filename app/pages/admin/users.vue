<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Admin Users — Knowledge Orbit' })

const client = useSupabaseClient()
const users = ref<{ id: string; username: string; full_name: string | null; role: string; created_at: string }[]>([])

onMounted(async () => {
  const { data } = await client.from('profiles').select('*').order('created_at', { ascending: false })
  users.value = data ?? []
})

async function toggleRole(user: (typeof users.value)[0]) {
  const newRole = user.role === 'admin' ? 'member' : 'admin'
  await client.from('profiles').update({ role: newRole }).eq('id', user.id)
  user.role = newRole
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-6">Users</h1>
    <UTable
      :data="users"
      :columns="[
        { key: 'username', label: 'Username' },
        { key: 'full_name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'created_at', label: 'Joined' },
        { key: 'actions', label: '' }
      ]"
    >
      <template #username-cell="{ row }">
        <NuxtLink :to="`/u/${row.original.username}`" class="hover:text-primary">
          {{ row.original.username }}
        </NuxtLink>
      </template>
      <template #role-cell="{ row }">
        <UBadge :color="row.original.role === 'admin' ? 'warning' : 'neutral'" :label="row.original.role" size="sm" />
      </template>
      <template #created_at-cell="{ row }">
        {{ new Date(row.original.created_at).toLocaleDateString() }}
      </template>
      <template #actions-cell="{ row }">
        <UButton size="xs" variant="outline"
          :label="row.original.role === 'admin' ? 'Demote' : 'Make Admin'"
          @click="toggleRole(row.original)" />
      </template>
    </UTable>
  </div>
</template>
