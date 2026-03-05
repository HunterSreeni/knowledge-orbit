# Phase 5 — Growth Features

## Goal
Features that drive return visits, shares, and discovery:
- Related posts by tags
- Newsletter capture (self-hosted, no monthly fees)
- Social sharing buttons (OG-aware)
- Reading progress bar
- Author spotlight pages
- Post series navigation (prev/next in series)

## Related Posts

At the bottom of every post (above end-of-post ad):

```ts
// In pages/posts/[slug].vue, after fetching post
const { data: related } = await useAsyncData(`related-${slug}`, async () => {
  const tagIds = post.value?.tags?.map(t => t.id) || []
  if (!tagIds.length) return []

  const { data } = await client
    .from('posts')
    .select(`id, title, slug, excerpt, cover_image_url,
             published_at, reading_time_mins,
             author:profiles(username, full_name, avatar_url),
             post_tags!inner(tag_id)`)
    .eq('status', 'published')
    .in('post_tags.tag_id', tagIds)
    .neq('id', post.value?.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return data || []
})
```

Renders as 3 PostCard components in a row (2-col on mobile).

## Newsletter Capture

Strategy: Collect emails → store in Supabase → send via Resend (free tier: 3000/month) or Buttondown.

### Option A: Resend (recommended)
- Free: 3000 emails/month, 100/day
- Simple API: just a POST with API key
- No separate platform to manage

### DB addition
```sql
CREATE TABLE newsletter_subscribers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  confirmed   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read newsletter" ON newsletter_subscribers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Server route: /api/newsletter/subscribe.post.ts
```ts
export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)
  if (!email || !email.includes('@')) throw createError({ statusCode: 400, message: 'Invalid email' })

  const client = serverSupabaseServiceRole(event)
  const { error } = await client
    .from('newsletter_subscribers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) throw createError({ statusCode: 500, message: 'Subscription failed' })
  return { ok: true }
})
```

### Component: NewsletterCapture.vue
Placed at end of every post (after related posts, before footer):
- Email input + "Subscribe" button
- Success/error state
- Copy: "Get new posts delivered to your inbox. No spam, unsubscribe anytime."

### Admin: subscriber count in analytics dashboard

## Social Sharing Buttons

Component: `PostShare.vue`
Placed below post title on desktop, sticky bottom bar on mobile.

Buttons:
- Twitter/X: `https://twitter.com/intent/tweet?text={title}&url={url}`
- LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={url}`
- WhatsApp: `https://wa.me/?text={title} {url}` (popular in India)
- Copy link: clipboard API with toast feedback

```vue
<script setup>
const props = defineProps<{ title: string; url: string }>()
const copied = ref(false)

const copyLink = async () => {
  await navigator.clipboard.writeText(props.url)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>
```

## Reading Progress Bar

Thin progress bar at the top of the viewport, fills as user scrolls through post content.

```ts
// app/composables/useReadingProgress.ts
export function useReadingProgress() {
  const progress = ref(0)

  const update = () => {
    const el = document.getElementById('post-content')
    if (!el) return
    const { top, height } = el.getBoundingClientRect()
    const scrolled = Math.max(0, -top)
    const total = height - window.innerHeight
    progress.value = Math.min(100, (scrolled / total) * 100)
  }

  onMounted(() => window.addEventListener('scroll', update, { passive: true }))
  onUnmounted(() => window.removeEventListener('scroll', update))

  return { progress }
}
```

Rendered as a `<div>` with `position: fixed; top: 0; height: 3px; background: var(--accent)`.

## Series Navigation

In PostView, if post belongs to a series, show prev/next navigation:
```
< Previous: "Part 1 — Setup"     Next: "Part 3 — Deploy" >
```

Fetch series posts ordered by position (or published_at) and find current post's index.

## Author Spotlight Pages

Enhance `pages/u/[username].vue`:
- Avatar, full name, bio, website link
- Social links: Twitter, LinkedIn, GitHub (stored in profiles)
- Post count, total likes received
- Author's series listed separately
- "Follow" button placeholder (for future email notify feature)

### profiles table additions (migration)
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text;
```

## Estimated Impact per Feature

| Feature | Impact |
|---|---|
| Related posts | +15-25% pages/session |
| Newsletter capture | Long-term retention, return visits |
| Social share | Distribution, backlinks |
| Reading progress | Engagement signal, UX |
| Series nav | Series completion rate |
| Author spotlight | Community feel, multi-author trust |

## Phase 5 Completion Checklist

- [ ] Related posts (by shared tags, limit 3)
- [ ] newsletter_subscribers table created
- [ ] /api/newsletter/subscribe server route
- [ ] NewsletterCapture.vue component in post pages
- [ ] Admin shows subscriber count
- [ ] Social share buttons (Twitter/X, LinkedIn, WhatsApp, Copy)
- [ ] Reading progress bar (fixed top, only on post pages)
- [ ] Series prev/next navigation in PostView
- [ ] Author spotlight pages enhanced (bio, social links, stats)
- [ ] profiles social columns migration applied
