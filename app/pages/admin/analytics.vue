<script setup lang="ts">
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Analytics — Knowledge Orbit' })

const client = useSupabaseClient()
const period = ref<'7d' | '30d' | '90d'>('30d')
const loading = ref(true)

// ── Data ─────────────────────────────────────────────────
const stats = ref({ totalViews: 0, uniqueVisitors: 0, topPost: '', adClicks: 0 })
const dailyViews = ref<{ day: string; views: number; unique_visitors: number }[]>([])
const topPosts = ref<{ path: string; views: number }[]>([])
const trafficSources = ref<Record<string, number>>({})
const deviceTypes = ref<Record<string, number>>({})
const adPerf = ref<{ id: string; name: string; type: string; program: string; impressions: number; clicks: number; ctr_percent: number }[]>([])
const topCountries = ref<{ country: string; views: number }[]>([])

const periodDays = computed(() => ({ '7d': 7, '30d': 30, '90d': 90 }[period.value])!)

async function load() {
  loading.value = true
  const since = new Date(Date.now() - periodDays.value * 86400000).toISOString()

  const [
    viewsResult,
    sourcesResult,
    devicesResult,
    countriesResult,
    adClicksResult,
    adPerfResult
  ] = await Promise.all([
    client.from('page_views').select('path, session_id, created_at').gte('created_at', since),
    client.from('page_views').select('referrer_source').gte('created_at', since),
    client.from('page_views').select('device_type').gte('created_at', since),
    client.from('page_views').select('country').gte('created_at', since).not('country', 'is', null),
    client.from('ad_events').select('id', { count: 'exact', head: true }).eq('event_type', 'click').gte('created_at', since),
    client.from('ad_performance').select('*')
  ])

  const views = viewsResult.data ?? []

  // Stat cards
  const uniqueSessions = new Set(views.map((v: any) => v.session_id).filter(Boolean))
  stats.value.totalViews = views.length
  stats.value.uniqueVisitors = uniqueSessions.size
  stats.value.adClicks = adClicksResult.count ?? 0

  // Daily views
  const dayMap = new Map<string, { views: number; sessions: Set<string> }>()
  for (const v of views as any[]) {
    const day = v.created_at.slice(0, 10)
    if (!dayMap.has(day)) dayMap.set(day, { views: 0, sessions: new Set() })
    const entry = dayMap.get(day)!
    entry.views++
    if (v.session_id) entry.sessions.add(v.session_id)
  }
  dailyViews.value = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, d]) => ({ day, views: d.views, unique_visitors: d.sessions.size }))

  // Top posts
  const postMap = new Map<string, number>()
  for (const v of views as any[]) {
    if (v.path?.startsWith('/posts/')) {
      postMap.set(v.path, (postMap.get(v.path) ?? 0) + 1)
    }
  }
  topPosts.value = [...postMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  stats.value.topPost = topPosts.value[0]?.path?.replace('/posts/', '') ?? '—'

  // Traffic sources
  const srcMap: Record<string, number> = {}
  for (const v of sourcesResult.data ?? [] as any[]) {
    const s = v.referrer_source || 'direct'
    srcMap[s] = (srcMap[s] ?? 0) + 1
  }
  trafficSources.value = srcMap

  // Devices
  const devMap: Record<string, number> = {}
  for (const v of devicesResult.data ?? [] as any[]) {
    const d = v.device_type || 'desktop'
    devMap[d] = (devMap[d] ?? 0) + 1
  }
  deviceTypes.value = devMap

  // Countries
  const cMap = new Map<string, number>()
  for (const v of countriesResult.data ?? [] as any[]) {
    if (v.country) cMap.set(v.country, (cMap.get(v.country) ?? 0) + 1)
  }
  topCountries.value = [...cMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([country, views]) => ({ country, views }))

  adPerf.value = (adPerfResult.data ?? []) as typeof adPerf.value

  loading.value = false
}

watch(period, load)
onMounted(load)

// ── Chart configs ─────────────────────────────────────────
const lineData = computed(() => ({
  labels: dailyViews.value.map(d => d.day.slice(5)),
  datasets: [
    {
      label: 'Page Views',
      data: dailyViews.value.map(d => d.views),
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14,165,233,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3
    },
    {
      label: 'Unique Visitors',
      data: dailyViews.value.map(d => d.unique_visitors),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139,92,246,0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: 3
    }
  ]
}))

const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } }

const topPostsData = computed(() => ({
  labels: topPosts.value.map(p => p.path.replace('/posts/', '').slice(0, 25)),
  datasets: [{
    label: 'Views',
    data: topPosts.value.map(p => p.views),
    backgroundColor: '#0ea5e9'
  }]
}))

const barOptions = { responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false } } }

const sourcesData = computed(() => ({
  labels: Object.keys(trafficSources.value),
  datasets: [{
    data: Object.values(trafficSources.value),
    backgroundColor: ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#6b7280']
  }]
}))

const devicesData = computed(() => ({
  labels: Object.keys(deviceTypes.value),
  datasets: [{
    data: Object.values(deviceTypes.value),
    backgroundColor: ['#0ea5e9', '#8b5cf6', '#10b981']
  }]
}))

const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } }
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">Analytics</h1>
      <div class="flex gap-1 border border-default rounded-lg p-0.5">
        <button
          v-for="p in ['7d', '30d', '90d']"
          :key="p"
          class="px-3 py-1 text-sm rounded-md transition-colors"
          :class="period === p ? 'bg-sky-500 text-white font-medium' : 'text-muted hover:text-default'"
          @click="period = p as typeof period"
        >
          {{ p }}
        </button>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="p-5 border border-default rounded-xl">
        <UIcon name="i-lucide-eye" class="w-5 h-5 text-sky-500 mb-2" />
        <p class="text-2xl font-bold">{{ stats.totalViews.toLocaleString() }}</p>
        <p class="text-sm text-muted">Page Views</p>
      </div>
      <div class="p-5 border border-default rounded-xl">
        <UIcon name="i-lucide-users" class="w-5 h-5 text-purple-500 mb-2" />
        <p class="text-2xl font-bold">{{ stats.uniqueVisitors.toLocaleString() }}</p>
        <p class="text-sm text-muted">Unique Visitors</p>
      </div>
      <div class="p-5 border border-default rounded-xl">
        <UIcon name="i-lucide-file-text" class="w-5 h-5 text-green-500 mb-2" />
        <p class="text-lg font-bold truncate">{{ stats.topPost || '—' }}</p>
        <p class="text-sm text-muted">Top Post</p>
      </div>
      <div class="p-5 border border-default rounded-xl">
        <UIcon name="i-lucide-mouse-pointer-click" class="w-5 h-5 text-amber-500 mb-2" />
        <p class="text-2xl font-bold">{{ stats.adClicks.toLocaleString() }}</p>
        <p class="text-sm text-muted">Ad Clicks</p>
      </div>
    </div>

    <div v-if="loading" class="grid gap-6">
      <USkeleton class="h-64 rounded-xl" />
      <div class="grid sm:grid-cols-2 gap-6">
        <USkeleton class="h-64 rounded-xl" />
        <USkeleton class="h-64 rounded-xl" />
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Line chart: views over time -->
      <div class="border border-default rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4">Page Views Over Time</h2>
        <div class="h-56">
          <Line :data="lineData" :options="lineOptions" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-6">
        <!-- Top posts bar chart -->
        <div class="border border-default rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4">Top Posts</h2>
          <div class="h-56">
            <Bar v-if="topPosts.length" :data="topPostsData" :options="barOptions" />
            <p v-else class="text-sm text-muted text-center pt-10">No post views yet</p>
          </div>
        </div>

        <!-- Traffic sources doughnut -->
        <div class="border border-default rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4">Traffic Sources</h2>
          <div class="h-56">
            <Doughnut v-if="Object.keys(trafficSources).length" :data="sourcesData" :options="doughnutOptions" />
            <p v-else class="text-sm text-muted text-center pt-10">No data yet</p>
          </div>
        </div>

        <!-- Device types -->
        <div class="border border-default rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4">Device Types</h2>
          <div class="h-56">
            <Doughnut v-if="Object.keys(deviceTypes).length" :data="devicesData" :options="doughnutOptions" />
            <p v-else class="text-sm text-muted text-center pt-10">No data yet</p>
          </div>
        </div>

        <!-- Top countries -->
        <div class="border border-default rounded-xl p-5">
          <h2 class="text-sm font-semibold mb-4">Top Countries</h2>
          <div class="space-y-2 overflow-y-auto max-h-56">
            <div
              v-for="c in topCountries"
              :key="c.country"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-muted">{{ c.country }}</span>
              <span class="font-medium">{{ c.views.toLocaleString() }}</span>
            </div>
            <p v-if="!topCountries.length" class="text-sm text-muted">No country data yet</p>
          </div>
        </div>
      </div>

      <!-- Ad performance table -->
      <div class="border border-default rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4">Ad Performance</h2>
        <UTable
          :data="adPerf"
          :columns="[
            { key: 'name', label: 'Ad' },
            { key: 'type', label: 'Type' },
            { key: 'program', label: 'Program' },
            { key: 'impressions', label: 'Impressions' },
            { key: 'clicks', label: 'Clicks' },
            { key: 'ctr_percent', label: 'CTR %' }
          ]"
        >
          <template #ctr_percent-cell="{ row }">
            <span
              class="font-medium"
              :class="row.original.ctr_percent >= 5 ? 'text-green-600 dark:text-green-400'
                : row.original.ctr_percent >= 2 ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-muted'"
            >
              {{ (row.original.ctr_percent ?? 0).toFixed(1) }}%
            </span>
          </template>
        </UTable>
        <p v-if="!adPerf.length" class="text-sm text-muted text-center py-6">No ad data yet</p>
      </div>
    </div>
  </div>
</template>
