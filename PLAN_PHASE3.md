# Phase 3 — Custom Supabase Analytics

## Goal
Zero-dependency analytics tracked entirely in Supabase:
- Page views per post + global
- Traffic sources (referrer)
- Device type breakdown
- Top posts by views
- Ad performance (impressions, clicks, CTR per ad)
- Charts in admin dashboard

## DB Schema Additions

```sql
-- Page views
CREATE TABLE page_views (
  id          bigserial PRIMARY KEY,
  path        text NOT NULL,            -- /posts/my-slug, /, /tags/vue etc
  referrer    text,                     -- full referrer URL
  referrer_source text,                 -- extracted: google, twitter, direct, etc
  device_type text,                     -- mobile / tablet / desktop
  session_id  text,                     -- anonymous fingerprint for unique visitor count
  country     text,                     -- from CF-IPCountry header (Netlify provides this)
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_created_at ON page_views(created_at);
CREATE INDEX idx_page_views_session ON page_views(session_id);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Anon insert (tracking fires from server route, no client JS)
CREATE POLICY "anon insert page views" ON page_views FOR INSERT WITH CHECK (true);

-- Admin read only
CREATE POLICY "admin read page views" ON page_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

## Server Route: /api/track.post.ts

Tracking fires server-side so it is NOT blocked by adblockers.

```ts
// server/api/track.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { path, sessionId } = body

  const ua = getRequestHeader(event, 'user-agent') || ''
  const referrer = getRequestHeader(event, 'referer') || ''
  const country = getRequestHeader(event, 'cf-ipcountry') || null

  // Simple device detection from UA
  const device = /mobile/i.test(ua) ? 'mobile'
    : /tablet|ipad/i.test(ua) ? 'tablet'
    : 'desktop'

  // Extract referrer source
  let source = 'direct'
  if (referrer) {
    if (/google\./i.test(referrer)) source = 'google'
    else if (/twitter\.com|t\.co/i.test(referrer)) source = 'twitter'
    else if (/linkedin\.com/i.test(referrer)) source = 'linkedin'
    else if (/reddit\.com/i.test(referrer)) source = 'reddit'
    else if (/facebook\.com/i.test(referrer)) source = 'facebook'
    else source = 'other'
  }

  const client = serverSupabaseServiceRole(event)
  await client.from('page_views').insert({
    path,
    referrer: referrer || null,
    referrer_source: source,
    device_type: device,
    session_id: sessionId || null,
    country,
  })

  return { ok: true }
})
```

## Client Composable: useAnalytics.ts

Called once in app.vue or a plugin to fire on every navigation:

```ts
// app/composables/useAnalytics.ts
export function useAnalytics() {
  const router = useRouter()

  const getSessionId = () => {
    const key = 'ko_sid'
    let sid = sessionStorage.getItem(key)
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem(key, sid)
    }
    return sid
  }

  const track = (path: string) => {
    // Use sendBeacon for reliability, fallback to fetch
    const payload = JSON.stringify({ path, sessionId: getSessionId() })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } })
    }
  }

  onMounted(() => {
    track(router.currentRoute.value.path)
    router.afterEach((to) => track(to.path))
  })
}
```

## Admin Analytics Dashboard (/admin/analytics.vue)

### Layout: 3-column stat cards + charts below

**Stat Cards (top row):**
- Total page views (7d / 30d / all time — toggle)
- Unique visitors (distinct session_ids)
- Top post (most views in period)
- Total ad clicks in period

**Charts:**
1. Line chart — Page views over time (7d/30d/90d selector)
2. Bar chart — Top 10 posts by views
3. Doughnut chart — Traffic sources breakdown (google/twitter/linkedin/reddit/direct/other)
4. Bar chart — Device type (mobile/tablet/desktop)

**Ad Performance Table:**
| Ad Name | Type | Program | Impressions | Clicks | CTR |
- Sorted by CTR descending
- Color-coded: CTR > 5% = green, 2-5% = yellow, < 2% = red

**Country Table:**
- Top 10 countries by visits
- Uses country code from cf-ipcountry

## Supabase SQL Views (for fast queries)

```sql
-- Daily views for the last 90 days
CREATE VIEW daily_views AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS views,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
WHERE created_at > now() - interval '90 days'
GROUP BY 1
ORDER BY 1;

-- Top posts by views (all time)
CREATE VIEW top_posts_by_views AS
SELECT
  path,
  COUNT(*) AS views,
  COUNT(DISTINCT session_id) AS unique_visitors
FROM page_views
WHERE path LIKE '/posts/%'
GROUP BY path
ORDER BY views DESC
LIMIT 50;

-- Ad performance
CREATE VIEW ad_performance AS
SELECT
  a.id,
  a.name,
  a.type,
  a.program,
  COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE e.event_type = 'click') AS clicks,
  ROUND(
    COUNT(*) FILTER (WHERE e.event_type = 'click')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'impression'), 0) * 100, 2
  ) AS ctr_percent
FROM ads a
LEFT JOIN ad_events e ON e.ad_id = a.id
GROUP BY a.id, a.name, a.type, a.program;
```

## Phase 3 Completion Checklist

- [ ] page_views table created + indexes + RLS
- [ ] /api/track server route working
- [ ] useAnalytics composable fires on every navigation
- [ ] Session ID generates and persists for session
- [ ] Supabase views created (daily_views, top_posts_by_views, ad_performance)
- [ ] Admin analytics page stat cards working
- [ ] Line chart (views over time)
- [ ] Bar chart (top posts)
- [ ] Doughnut chart (traffic sources)
- [ ] Ad performance table with CTR color coding
- [ ] Country breakdown table
