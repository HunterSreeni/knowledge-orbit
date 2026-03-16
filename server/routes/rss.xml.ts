import { Feed } from 'feed'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data: posts } = await client
    .from('posts')
    .select('title, slug, excerpt, published_at, author:profiles(full_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  const siteUrl = 'https://knowledgeorbit.sreeniverse.co.in'

  const feed = new Feed({
    title: 'Knowledge Orbit',
    description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    copyright: `Knowledge Orbit ${new Date().getFullYear()}`
  })

  for (const p of posts || []) {
    feed.addItem({
      title: p.title,
      id: `${siteUrl}/posts/${p.slug}`,
      link: `${siteUrl}/posts/${p.slug}`,
      description: p.excerpt || '',
      date: new Date(p.published_at),
      author: [{ name: (p.author as { full_name: string })?.full_name || 'Unknown' }]
    })
  }

  setResponseHeader(event, 'Content-Type', 'application/rss+xml')
  return feed.rss2()
})
