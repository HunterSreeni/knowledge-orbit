# Phase 4 — SEO

## Goal
Make every post and page fully indexable and shareable:
- Dynamic meta + OG tags per page
- Auto-generated OG images per post
- Sitemap from Supabase posts
- Structured data (Article JSON-LD)
- robots.txt
- Canonical URLs

## Modules

Already installed in Phase 1 via `@nuxtjs/seo`. This meta-module includes:
- `nuxt-og-image` — dynamic OG image generation
- `@nuxtjs/sitemap` — auto sitemap from pages + Supabase
- `nuxt-schema-org` — JSON-LD structured data
- `nuxt-robots` — robots.txt

## nuxt.config.ts Additions

```ts
site: {
  url: 'https://knowledgeorbit.sreeniverse.co.in',
  name: 'Knowledge Orbit',
  description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
  defaultLocale: 'en',
},

ogImage: {
  fonts: ['Inter:400', 'Inter:700'],
},

sitemap: {
  sources: ['/api/sitemap'],  // custom server route that fetches from Supabase
},
```

## Per-Page useSeoMeta

### Home (pages/index.vue)
```ts
useSeoMeta({
  title: 'Knowledge Orbit — Diverse Perspectives',
  description: 'Anime, AI/LLM, security, and more. Written by passionate people.',
  ogImage: '/og-default.png',
})
```

### Post (pages/posts/[slug].vue)
```ts
// post fetched via useAsyncData
useSeoMeta({
  title: () => `${post.value?.title} — Knowledge Orbit`,
  description: () => post.value?.excerpt,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.excerpt,
  ogImage: () => post.value?.cover_image_url || undefined,
  ogType: 'article',
  articlePublishedTime: () => post.value?.published_at,
  articleAuthor: () => post.value?.author?.full_name,
  twitterCard: 'summary_large_image',
})

// Dynamic OG image if no cover image
defineOgImageComponent('KoPostOg', {
  title: post.value?.title,
  author: post.value?.author?.full_name,
  tags: post.value?.tags?.map(t => t.name),
})
```

### Tag / Series / Author pages
```ts
useSeoMeta({
  title: () => `${tag.value?.name} posts — Knowledge Orbit`,
  description: () => `Browse all posts tagged with ${tag.value?.name}`,
})
```

## Dynamic OG Image Component

Create `app/components/OgImage/KoPostOg.vue`:
```vue
<script setup>
defineProps<{
  title: string
  author?: string
  tags?: string[]
}>()
</script>

<template>
  <div class="w-full h-full bg-gray-900 flex flex-col p-12">
    <div class="text-blue-400 text-2xl font-bold mb-4">Knowledge Orbit</div>
    <div class="text-white text-5xl font-bold leading-tight flex-1">{{ title }}</div>
    <div class="flex items-center gap-4 mt-auto">
      <span v-if="author" class="text-gray-400 text-xl">{{ author }}</span>
      <div class="flex gap-2">
        <span v-for="tag in tags?.slice(0, 3)" :key="tag"
          class="bg-blue-900 text-blue-300 px-3 py-1 rounded text-sm">
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
```

## Sitemap Server Route

`server/api/sitemap.get.ts`:
```ts
export default defineEventHandler(async (event) => {
  const client = serverSupabaseClient(event)
  const { data: posts } = await client
    .from('posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (posts || []).map(p => ({
    loc: `/posts/${p.slug}`,
    lastmod: p.updated_at,
    changefreq: 'weekly',
    priority: 0.8,
  }))
})
```

The @nuxtjs/sitemap module merges this with auto-discovered static routes.
Final sitemap at: /sitemap.xml

## Structured Data (Article Schema)

In pages/posts/[slug].vue, after fetching post:
```ts
useSchemaOrg([
  defineArticle({
    headline: post.value?.title,
    description: post.value?.excerpt,
    image: post.value?.cover_image_url,
    datePublished: post.value?.published_at,
    dateModified: post.value?.updated_at,
    author: {
      '@type': 'Person',
      name: post.value?.author?.full_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Knowledge Orbit',
      url: 'https://knowledgeorbit.sreeniverse.co.in',
    },
  }),
])
```

## robots.txt

`nuxt.config.ts`:
```ts
robots: {
  disallow: ['/admin', '/dashboard', '/write', '/edit'],
  allow: '/',
  sitemap: 'https://knowledgeorbit.sreeniverse.co.in/sitemap.xml',
}
```

## Canonical URLs

Nuxt SEO handles canonical automatically from the site.url config.
Override per-page if needed:
```ts
useHead({ link: [{ rel: 'canonical', href: `https://knowledgeorbit.sreeniverse.co.in/posts/${slug}` }] })
```

## RSS Feed

`server/routes/rss.xml.ts`:
```ts
import { Feed } from 'feed'

export default defineEventHandler(async (event) => {
  const client = serverSupabaseClient(event)
  const { data: posts } = await client
    .from('posts')
    .select('title, slug, excerpt, published_at, author:profiles(full_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  const feed = new Feed({
    title: 'Knowledge Orbit',
    description: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    id: 'https://knowledgeorbit.sreeniverse.co.in',
    link: 'https://knowledgeorbit.sreeniverse.co.in',
    language: 'en',
    copyright: `Knowledge Orbit ${new Date().getFullYear()}`,
  })

  for (const p of posts || []) {
    feed.addItem({
      title: p.title,
      id: `https://knowledgeorbit.sreeniverse.co.in/posts/${p.slug}`,
      link: `https://knowledgeorbit.sreeniverse.co.in/posts/${p.slug}`,
      description: p.excerpt,
      date: new Date(p.published_at),
      author: [{ name: p.author?.full_name }],
    })
  }

  setHeader(event, 'Content-Type', 'application/rss+xml')
  return feed.rss2()
})
```

Install: `npm install feed`

## Phase 4 Completion Checklist

- [ ] @nuxtjs/seo configured in nuxt.config.ts
- [ ] site.url, site.name set correctly
- [ ] useSeoMeta in all public pages (home, post, tag, series, author, search)
- [ ] Dynamic OG image component (KoPostOg)
- [ ] Sitemap server route returning all published posts
- [ ] /sitemap.xml accessible and valid
- [ ] Article JSON-LD on post pages (verify in Google Rich Results Test)
- [ ] robots.txt blocking admin routes
- [ ] Canonical URLs on all pages
- [ ] RSS feed at /rss.xml
- [ ] Open Graph preview tested (use opengraph.xyz or similar)
- [ ] Twitter card tested
