import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data: posts } = await client
    .from('posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (posts || []).map(p => ({
    loc: `/posts/${p.slug}`,
    lastmod: p.updated_at,
    changefreq: 'weekly',
    priority: 0.8
  }))
})
