<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Ads Manager — Knowledge Orbit' })

interface Ad {
  id: string
  name: string
  type: string
  program: string
  is_active: boolean
  rotation_weight: number
  created_at: string
  impressions?: number
  clicks?: number
  ctr?: number
}

const client = useSupabaseClient()
const ads = ref<Ad[]>([])
const loading = ref(true)
const filterType = ref<string>('all')
const filterStatus = ref<string>('all')
const error = ref('')

onMounted(loadAds)

async function loadAds() {
  loading.value = true
  try {
    // Load ads with performance via the ad_performance view if available
    const { data: adsData } = await client
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: perfData } = await client
      .from('ad_performance')
      .select('*')

    const perfMap = new Map((perfData ?? []).map((p: any) => [p.id, p]))

    ads.value = (adsData ?? []).map((ad: any) => {
      const perf = perfMap.get(ad.id)
      return {
        ...ad,
        impressions: perf?.impressions ?? 0,
        clicks: perf?.clicks ?? 0,
        ctr: perf?.ctr_percent ?? 0
      }
    })
  } catch {
    error.value = 'Failed to load ads.'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  return ads.value.filter(ad => {
    if (filterType.value !== 'all' && ad.type !== filterType.value) return false
    if (filterStatus.value === 'active' && !ad.is_active) return false
    if (filterStatus.value === 'inactive' && ad.is_active) return false
    return true
  })
})

async function toggleActive(ad: Ad) {
  await client.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
  ad.is_active = !ad.is_active
}

async function remove(id: string, name: string) {
  if (!confirm(`Delete ad "${name}"? This cannot be undone.`)) return
  await client.from('ads').delete().eq('id', id)
  ads.value = ads.value.filter(a => a.id !== id)
}

const programColors: Record<string, string> = {
  amazon: 'warning',
  cashkaro: 'success',
  cred_upi: 'info',
  custom: 'neutral'
}

const typeLabels: Record<string, string> = {
  inline: 'Inline',
  banner: 'Banner',
  end_of_post: 'End of Post',
  sidebar: 'Sidebar'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Ads Manager</h1>
      <UButton to="/admin/ads/new" icon="i-lucide-plus" label="New Ad" />
    </div>

    <UAlert v-if="error" :title="error" color="error" variant="soft" class="mb-4" />

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <USelect
        v-model="filterType"
        :options="[
          { label: 'All types', value: 'all' },
          { label: 'Inline', value: 'inline' },
          { label: 'Banner', value: 'banner' },
          { label: 'End of Post', value: 'end_of_post' },
          { label: 'Sidebar', value: 'sidebar' }
        ]"
        size="sm"
      />
      <USelect
        v-model="filterStatus"
        :options="[
          { label: 'All status', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]"
        size="sm"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 4" :key="i" class="h-12 rounded-lg" />
    </div>

    <!-- Table -->
    <UTable
      v-else
      :data="filtered"
      :columns="[
        { key: 'name', label: 'Ad' },
        { key: 'type', label: 'Type' },
        { key: 'program', label: 'Program' },
        { key: 'rotation_weight', label: 'Weight' },
        { key: 'impressions', label: 'Impr.' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'ctr', label: 'CTR %' },
        { key: 'is_active', label: 'Status' },
        { key: 'actions', label: '' }
      ]"
    >
      <template #name-cell="{ row }">
        <span class="font-medium text-sm">{{ row.original.name }}</span>
      </template>
      <template #type-cell="{ row }">
        <UBadge :label="typeLabels[row.original.type] || row.original.type" size="sm" variant="soft" />
      </template>
      <template #program-cell="{ row }">
        <UBadge
          :label="row.original.program"
          :color="programColors[row.original.program] || 'neutral'"
          size="sm"
          variant="soft"
        />
      </template>
      <template #rotation_weight-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.rotation_weight }}/10</span>
      </template>
      <template #impressions-cell="{ row }">
        <span class="text-sm">{{ (row.original.impressions ?? 0).toLocaleString() }}</span>
      </template>
      <template #clicks-cell="{ row }">
        <span class="text-sm">{{ (row.original.clicks ?? 0).toLocaleString() }}</span>
      </template>
      <template #ctr-cell="{ row }">
        <span
          class="text-sm font-medium"
          :class="(row.original.ctr ?? 0) >= 5 ? 'text-green-600 dark:text-green-400'
            : (row.original.ctr ?? 0) >= 2 ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-muted'"
        >
          {{ (row.original.ctr ?? 0).toFixed(1) }}%
        </span>
      </template>
      <template #is_active-cell="{ row }">
        <UToggle :model-value="row.original.is_active" @update:model-value="toggleActive(row.original)" />
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1 justify-end">
          <UButton size="xs" variant="ghost" :to="`/admin/ads/${row.original.id}`" icon="i-lucide-pen" />
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="remove(row.original.id, row.original.name)" />
        </div>
      </template>
    </UTable>

    <div v-if="!loading && filtered.length === 0" class="text-center py-16 text-muted">
      <UIcon name="i-lucide-megaphone" class="size-10 text-muted/30 mx-auto mb-3" />
      <p>No ads found. Create your first ad to get started.</p>
    </div>
  </div>
</template>
