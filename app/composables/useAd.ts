interface Ad {
  id: string
  name: string
  type: string
  program: string
  image_url: string | null
  link_url: string
  cta_text: string
  description: string | null
  rotation_weight: number
  is_active: boolean
}

function pickWeighted(ads: Ad[]): Ad {
  const totalWeight = ads.reduce((sum, a) => sum + a.rotation_weight, 0)
  let rand = Math.random() * totalWeight
  for (const a of ads) {
    rand -= a.rotation_weight
    if (rand <= 0) return a
  }
  return ads[ads.length - 1]!
}

export function useAd(type: 'inline' | 'banner' | 'end_of_post' | 'sidebar') {
  const client = useSupabaseClient()
  const ad = ref<Ad | null>(null)

  const load = async () => {
    const { data } = await client
      .from('ads')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
    if (data?.length) ad.value = pickWeighted(data as Ad[])
  }

  onMounted(load)
  return { ad }
}
