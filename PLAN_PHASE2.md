# Phase 2 — Custom Ad System + Monetization

## Goal
Full custom ad management with:
- Admin CRUD panel for ads (Ads Manager)
- Weighted rotation engine
- Ad placement components (inline, banner, end-of-post, sidebar)
- Amazon Associates, CashKaro, CRED UPI integration
- Impression + click tracking via Supabase server routes
- Affiliate disclosure component

## DB Schema Additions

Add to supabase/schema.sql (or apply separately):

```sql
-- Ad programs enum
CREATE TYPE ad_program AS ENUM ('amazon', 'cashkaro', 'cred_upi', 'custom');
CREATE TYPE ad_type AS ENUM ('inline', 'banner', 'end_of_post', 'sidebar');
CREATE TYPE ad_event_type AS ENUM ('impression', 'click');

-- Ads table
CREATE TABLE ads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        ad_type NOT NULL,
  program     ad_program NOT NULL DEFAULT 'custom',
  image_url   text,
  link_url    text NOT NULL,
  cta_text    text DEFAULT 'Learn More',       -- "Buy on Amazon", "Get ₹200 on CashKaro"
  description text,                            -- short pitch text shown in card ads
  rotation_weight int NOT NULL DEFAULT 5 CHECK (rotation_weight BETWEEN 1 AND 10),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Ad events (impressions + clicks)
CREATE TABLE ad_events (
  id          bigserial PRIMARY KEY,
  ad_id       uuid REFERENCES ads(id) ON DELETE CASCADE,
  event_type  ad_event_type NOT NULL,
  post_slug   text,          -- which post the ad was shown on (nullable for home/tag pages)
  session_id  text,          -- anonymous session fingerprint for dedup
  referrer    text,
  created_at  timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ad_events_ad_id ON ad_events(ad_id);
CREATE INDEX idx_ad_events_created_at ON ad_events(created_at);

-- RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

-- Public can read active ads (needed for rotation engine on client)
CREATE POLICY "public read active ads" ON ads FOR SELECT USING (is_active = true);

-- Admin full access to ads
CREATE POLICY "admin all ads" ON ads FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Anon insert ad events (tracking)
CREATE POLICY "anon insert ad events" ON ad_events FOR INSERT WITH CHECK (true);

-- Admin read ad events (for analytics)
CREATE POLICY "admin read ad events" ON ad_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

## Server Routes (Nitro)

### `server/api/ads/impression.post.ts`
```ts
// Logs an ad impression (called from client when ad enters viewport)
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { adId, postSlug, sessionId } = body

  const client = serverSupabaseClient(event)
  await client.from('ad_events').insert({
    ad_id: adId,
    event_type: 'impression',
    post_slug: postSlug || null,
    session_id: sessionId || null,
    referrer: getRequestHeader(event, 'referer') || null,
  })
  return { ok: true }
})
```

### `server/api/ads/click.post.ts`
```ts
// Logs an ad click before redirect
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { adId, postSlug, sessionId } = body

  const client = serverSupabaseClient(event)
  await client.from('ad_events').insert({
    ad_id: adId,
    event_type: 'click',
    post_slug: postSlug || null,
    session_id: sessionId || null,
  })
  return { ok: true }
})
```

## Composable: useAd.ts

```ts
// app/composables/useAd.ts
// Fetches active ads by type and selects one using weighted random rotation

export function useAd(type: 'inline' | 'banner' | 'end_of_post' | 'sidebar') {
  const client = useSupabaseClient()
  const ad = ref(null)

  const pickWeighted = (ads) => {
    const totalWeight = ads.reduce((sum, a) => sum + a.rotation_weight, 0)
    let rand = Math.random() * totalWeight
    for (const a of ads) {
      rand -= a.rotation_weight
      if (rand <= 0) return a
    }
    return ads[ads.length - 1]
  }

  const load = async () => {
    const { data } = await client
      .from('ads')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
    if (data?.length) ad.value = pickWeighted(data)
  }

  onMounted(load)
  return { ad }
}
```

## Ad Components

### AdInline.vue
Rendered between paragraphs in PostView. Appears after every 3rd paragraph.
- Small card with optional image, description, CTA button
- Uses Intersection Observer to fire impression when visible
- Click logs to /api/ads/click then opens link in new tab (nofollow)
- Shows "Sponsored" badge + affiliate disclosure link

### AdBanner.vue
Full-width banner, shown at top of home feed and tag pages.

### AdEndOfPost.vue
Larger card shown at the bottom of every post.
Best placement for Amazon product recommendations.

### AdSidebar.vue
Sticky sidebar on desktop post view (hidden on mobile).

## Affiliate Disclosure Component

`AdDisclosure.vue` — shown once per page near first ad:
```
This post contains affiliate links. If you click and buy,
we may earn a small commission at no extra cost to you.
```
Required for FTC compliance + Amazon Associates TOS.

## Amazon Associates Integration

- Links must use full amazon.in/amazon.com domain (no link shorteners)
- Add `rel="nofollow sponsored"` to all Amazon links
- SiteStripe links → paste directly as link_url in ads DB
- Best placement: end_of_post and inline (after relevant content)

## CashKaro Integration

- Referral link format: cashkaro.com/r/[your-ref-code]
- Add as `program: 'cashkaro'` in ads table
- CTA text: "Get Cashback on CashKaro"
- No domain restriction — can use as-is

## CRED UPI Integration

- Referral link: app link or web link with ref param
- Add as `program: 'cred_upi'` in ads table
- CTA text: "Pay with CRED & Earn Rewards"

## Admin: Ads Manager

### /admin/ads/index.vue — Ad List
- Table with columns: Name, Type badge, Program badge, Status toggle, Weight, Impressions, Clicks, CTR, Edit/Delete
- "New Ad" button → /admin/ads/new
- Filter by type / program / status
- Bulk activate/deactivate

### /admin/ads/[id].vue — Create / Edit Ad
Form fields:
- Name (text input)
- Type (select: inline / banner / end_of_post / sidebar)
- Affiliate Program (select: amazon / cashkaro / cred_upi / custom)
- Image URL (upload to Supabase storage or paste URL)
- Destination Link URL (required)
- CTA Text (default: "Learn More")
- Short Description (textarea, optional)
- Rotation Weight (slider 1-10, label: "1 = rarely shown, 10 = shown most")
- Active toggle

Preview panel: live rendering of how the ad looks in the selected type

## Phase 2 Completion Checklist

- [ ] ads + ad_events tables created
- [ ] RLS policies applied
- [ ] Server routes /api/ads/impression and /api/ads/click working
- [ ] useAd composable with weighted rotation
- [ ] AdInline component with Intersection Observer impression tracking
- [ ] AdBanner component
- [ ] AdEndOfPost component
- [ ] AdSidebar component
- [ ] AdDisclosure component
- [ ] Ads injected in PostView (every 3rd paragraph + end)
- [ ] Ads on HomeView (banner at top)
- [ ] Admin Ads list page with performance metrics
- [ ] Admin Ad create/edit form
- [ ] Amazon Associates link verified (nofollow + disclosure)
- [ ] CashKaro referral link wired
- [ ] CRED UPI referral link wired
