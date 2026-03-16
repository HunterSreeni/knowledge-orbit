# Code Review — 2026-03-10

## Summary

The Knowledge Orbit v2 codebase is well-structured and largely follows Nuxt 4 / Supabase v2 patterns correctly. The most significant issues are: (1) a `v-html` rendering unsanitized TipTap-generated HTML that can execute XSS payloads if content storage is ever compromised, (2) three server API routes that accept and insert user-supplied data with zero input validation or length limits, and (3) `sessionStorage`, `window`, and `navigator` accessed directly in composables/stores without `import.meta.client` guards, causing SSR crashes. Several minor TypeScript and code-quality items also need attention.

---

## Files Reviewed

- `nuxt.config.ts`
- `supabase/schema.sql`
- `server/api/track.post.ts`
- `server/api/ads/click.post.ts`
- `server/api/ads/impression.post.ts`
- `app/middleware/admin.ts`
- `app/middleware/auth.ts`
- `app/middleware/auth-error.global.ts`
- `app/middleware/guest.ts`
- `app/layouts/default.vue`
- `app/layouts/admin.vue`
- `app/composables/useAd.ts`
- `app/composables/useAnalytics.ts`
- `app/composables/useSlug.ts`
- `app/components/ad/AdBanner.vue`
- `app/components/ad/AdInline.vue`
- `app/components/ad/AdEndOfPost.vue`
- `app/components/ad/AdSidebar.vue`
- `app/components/ad/AdDisclosure.vue`
- `app/components/AppLogo.vue`
- `app/components/PostCard.vue`
- `app/components/TemplateMenu.vue`
- `app/pages/index.vue`
- `app/pages/posts/[slug].vue`
- `app/pages/write.vue`
- `app/pages/edit/[slug].vue`
- `app/pages/dashboard.vue`
- `app/pages/login.vue`
- `app/pages/search.vue`
- `app/pages/confirm.vue`
- `app/pages/reset-password.vue`
- `app/pages/become-a-writer.vue`
- `app/pages/tags/[slug].vue`
- `app/pages/series/[slug].vue`
- `app/pages/u/[username].vue`
- `app/pages/admin/index.vue`
- `app/pages/admin/posts.vue`
- `app/pages/admin/users.vue`
- `app/pages/admin/analytics.vue`
- `app/pages/admin/tags.vue`
- `app/pages/admin/ads/index.vue`
- `app/pages/admin/ads/[id].vue`
- `app/pages/admin/promotions/index.vue`
- `app/stores/auth.ts`
- `app/stores/posts.ts`
- `shared/types/index.ts`

---

## Findings

### Critical (must fix before production deploy)

---

**File**: `app/pages/posts/[slug].vue` | **Line**: 158 | **Issue**: `v-html="contentHtml"` renders TipTap-generated HTML directly in the DOM. Although TipTap's `generateHTML` outputs structured HTML from a JSON document, the `content` field is stored as raw `jsonb` in Postgres and fetched with no sanitization step. If a malicious actor inserts a crafted JSON document directly into the database (via a compromised admin account, a Supabase MCP session, or an RLS bypass), the rendered HTML will execute arbitrary scripts in readers' browsers. The `Link` extension in particular can produce `href="javascript:..."` values unless explicitly blocked. **Fix**: Sanitize the generated HTML before binding it to `v-html`. Use DOMPurify (which is SSR-safe via `dompurify/no-jsdom` on server or `import.meta.client` guard):

```ts
// in posts/[slug].vue — replace the contentHtml computed
import DOMPurify from 'isomorphic-dompurify'

const contentHtml = computed(() => {
  const raw = post.value?.content
  if (!raw || typeof raw !== 'object') return ''
  try {
    const html = generateHTML(raw as Parameters<typeof generateHTML>[0], [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Underline
    ])
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p','h1','h2','h3','h4','h5','h6','ul','ol','li',
        'blockquote','pre','code','strong','em','u','a','img','br','hr'],
      ALLOWED_ATTR: ['href','src','alt','target','rel','class'],
      FORCE_BODY: false
    })
  } catch {
    return ''
  }
})
```

---

**File**: `server/api/track.post.ts` | **Lines**: 4–9 | **Issue**: No input validation on any field. `path` is inserted directly into the `page_views` table with no length check, no format check, and no type enforcement. A single HTTP request can insert a multi-megabyte string as the path value. Same applies to `post_id` (should be validated as a UUID), `sessionId` (unconstrained), and `referrer` (already from a header, but `path` and `sessionId` come from untrusted body). The `post_id` is accepted as-is and could silently fail FK constraint or waste Supabase write quota. **Fix**:

```ts
// server/api/track.post.ts — add validation before the insert
import { z } from 'zod'

const schema = z.object({
  path: z.string().max(2048).startsWith('/'),
  post_id: z.string().uuid().optional().nullable(),
  sessionId: z.string().max(128).optional().nullable()
})

const parsed = schema.safeParse(body)
if (!parsed.success) return { ok: false }
const { path, post_id, sessionId } = parsed.data
```

---

**File**: `server/api/ads/click.post.ts` | **Lines**: 4–9 | **Issue**: `adId` is inserted directly as `ad_id` into `ad_events` with no UUID format validation. An attacker can flood the table with garbage `adId` values (strings up to any length), causing FK errors to be silently swallowed. Additionally, there is no rate-limiting — a single IP can fire thousands of fake click events, permanently inflating CTR figures in the `ad_performance` view. The same issue exists identically in `server/api/ads/impression.post.ts`. **Fix**: Validate `adId` as a UUID string before inserting, and consider a lightweight rate-limit check (e.g. via a KV store or IP+adId deduplication window):

```ts
// ads/click.post.ts and ads/impression.post.ts — add validation
import { z } from 'zod'

const schema = z.object({
  adId: z.string().uuid(),
  postSlug: z.string().max(256).optional(),
  sessionId: z.string().max(128).optional()
})
const parsed = schema.safeParse(body)
if (!parsed.success) return { ok: false }
```

---

**File**: `app/composables/useAnalytics.ts` | **Lines**: 4–11, 16 | **Issue**: `sessionStorage`, `navigator.sendBeacon`, and the `track()` function body all run at the top level of the composable without any `import.meta.client` guard. The composable is called from `onMounted` (line 27), so in practice it never executes on the server — but the function definitions close over `sessionStorage` and `navigator` at parse time, which can throw a `ReferenceError` in the Nitro SSR sandbox if the module is evaluated during server-side rendering. Additionally the `router.afterEach` listener registered inside `onMounted` is never removed (no `onUnmounted` cleanup), causing a memory leak and duplicate tracking events if the component mounts more than once in a session. **Fix**:

```ts
// useAnalytics.ts
export function useAnalytics() {
  const router = useRouter()

  const getSessionId = (): string => {
    if (!import.meta.client) return ''
    const key = 'ko_sid'
    let sid = sessionStorage.getItem(key)
    if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem(key, sid) }
    return sid
  }

  const track = (path: string) => {
    if (!import.meta.client) return
    const payload = JSON.stringify({ path, sessionId: getSessionId() })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track', { method: 'POST', body: payload,
        headers: { 'Content-Type': 'application/json' } }).catch(() => {})
    }
  }

  onMounted(() => {
    track(router.currentRoute.value.path)
    const stop = router.afterEach((to) => track(to.path))
    onUnmounted(stop)
  })
}
```

---

**File**: `app/stores/auth.ts` | **Lines**: 25, 33, 41, 68 | **Issue**: `window.location.origin` is used directly (not guarded by `import.meta.client`) inside `signInWithGoogle`, `signInWithGitHub`, `signInWithLinkedIn`, and `requestPasswordReset`. These functions are called from `login.vue` which is always client-side, but the Pinia store module is imported and parsed during SSR. If the store is instantiated server-side (e.g. from middleware or a `useAsyncData` call) `window` will not exist in the Nitro runtime and will throw. **Fix**: Replace `window.location.origin` with Nuxt's `useRequestURL().origin` which is SSR-safe:

```ts
// In each OAuth function and requestPasswordReset:
const { origin } = useRequestURL()
// Use `origin` instead of `window.location.origin`
```

---

**File**: `app/components/ad/AdBanner.vue` (and `AdInline.vue`, `AdSidebar.vue`, `AdEndOfPost.vue`) | **Lines**: 9 (all four files) | **Issue**: `sessionStorage.getItem('ko_sid')` is called directly in `getSessionId()` which is invoked from inside `onMounted` callbacks. This is fine for the mounted hook itself, but the function is defined at the top scope of `<script setup>` without an `import.meta.client` guard. If Vue's SSR renderer ever calls setup before mounting (e.g. for streaming SSR or `<Suspense>`), `sessionStorage` will throw `ReferenceError`. Also: the `IntersectionObserver` is created inside `onMounted` but is only disconnected on the first intersection — if `ad.value` is still `null` when the observer fires (race condition), the observer is never disconnected and leaks. **Fix**: Wrap `getSessionId` with `import.meta.client` check, and always call `observer.disconnect()` inside `onUnmounted` as a fallback:

```ts
// In each ad component
let observer: IntersectionObserver | null = null

onMounted(() => { /* ... existing setup ... */ })

onUnmounted(() => {
  observer?.disconnect()
})
```

---

### Warning (should fix soon)

---

**File**: `app/pages/admin/users.vue` | **Line**: 14 | **Issue**: `toggleRole` sets a role to `'member'` when demoting, but the `user_role` enum in the schema only defines `'reader'`, `'writer'`, and `'admin'`. Inserting `'member'` will be rejected by Postgres at runtime with a type mismatch error, silently ignored because there is no error handling on the update call. The type mismatch is also reflected in `shared/types/index.ts` line 8 where `Profile.role` is typed as `'member' | 'admin'` — `'reader'` and `'writer'` are missing. **Suggestion**: Fix the demote target to `'reader'` to match the schema enum, and update the `Profile` type to `'reader' | 'writer' | 'admin'`.

---

**File**: `app/pages/edit/[slug].vue` | **Lines**: 23–25 | **Issue**: The author ownership guard checks `post.value.author?.id !== user.value?.id`, but `fetchBySlug` in the posts store only fetches posts with `status = 'published'` (line 55 of `stores/posts.ts`). A draft post fetched via this page will return `null` from `fetchBySlug`, throw a 404, and never reach the ownership check. An author trying to edit their own unpublished draft will get a 404 instead of being allowed to edit. **Suggestion**: Add a separate `fetchBySlugForEdit` query in the store that does not filter by `status = 'published'`, used only from the edit page.

---

**File**: `app/pages/admin/analytics.vue` | **Lines**: 63, 70, 83, 97, 104, 113 | **Issue**: Multiple `any` type casts (`as any[]`, `v.session_id as any`, etc.) are used throughout the `load()` function's data processing loops. This is technically unsafe and will suppress type errors if the Supabase query response shape changes. **Suggestion**: Type the `viewsResult.data` correctly using the generated Supabase types, or at minimum define a local interface for the expected row shape and cast to that.

---

**File**: `app/pages/posts/[slug].vue` | **Line**: 222 | **Issue**: `(post.author as any).bio` uses an unsafe `as any` cast. The `Profile` type already includes a `bio` field (defined in `shared/types/index.ts`), so the cast is unnecessary and masks the underlying issue that `author` is typed as `Profile | undefined` on `Post` but the joined query also selects `bio`. **Suggestion**: Add `bio` to the `POST_SELECT` constant in `stores/posts.ts` and remove the `as any` cast.

---

**File**: `app/pages/series/[slug].vue` | **Lines**: 36, 60, 64–68 | **Issue**: Multiple `as any` casts are used to access `series.author.username`, `.full_name`, and `.avatar_url`. The `author` join returns a typed object but the type is widened to `any` because the `useAsyncData` return is not annotated. **Suggestion**: Define an inline interface for the series-with-author shape and assign it as the generic type parameter to `useAsyncData`.

---

**File**: `app/pages/admin/ads/[id].vue` | **Line**: 40 | **Issue**: `Object.assign(form, data.value)` spreads the raw Supabase row directly into the reactive form object. If the database schema gains new columns (e.g. `target_audience`, `start_date`) those values will be spread into the form and then included in the `submit()` payload, potentially writing unexpected fields back to the database. **Suggestion**: Explicitly pick only the expected fields when hydrating the form from `data.value`.

---

**File**: `app/pages/admin/analytics.vue` | **Lines**: 52–58 | **Issue**: Five separate Supabase queries for `page_views` (by different column selections) are fired in parallel via `Promise.all`. This means the full `page_views` table (filtered by date) is fetched four times with different column sets, multiplying read costs and bandwidth. For a table that may grow to millions of rows, this will become expensive and slow. **Suggestion**: Fetch all needed columns (`path, session_id, created_at, referrer_source, device_type, country`) in a single query and derive all aggregations client-side from that one response.

---

**File**: `app/pages/login.vue` | **Lines**: 43–48 | **Issue**: `window.location.hash` is accessed directly inside `onMounted` — this is fine since `onMounted` is client-only, but `history.replaceState` is also called at line 48 without checking `import.meta.client`. If this component were ever rendered outside a browser context the call would crash. Minor risk given the `middleware: 'guest'` protection, but worth guarding. **Suggestion**: Wrap the entire `onMounted` block body in `if (!import.meta.client) return`.

---

**File**: `app/stores/posts.ts` | **Line**: 101 | **Issue**: `fetchByAuthor` filters with `.eq('author.username', username)`. In Supabase PostgREST, filtering on a joined foreign table column uses dot notation only when using `!inner` join syntax. Without `!inner`, this filter silently has no effect and returns all published posts regardless of author. **Suggestion**: Either add `author!inner(id, username, full_name, avatar_url)` in the select string, or filter by `author_id` using a subquery: `.eq('author_id', profileId)` after resolving the profile ID from the username in a prior query.

---

**File**: `app/pages/admin/posts.vue` | **Lines**: 16, 19–26 | **Issue**: The admin posts page fetches all posts at once (no pagination, no `.range()` limit). On a large blog this will time out or return a truncated response (Supabase default limit is 1,000 rows). The `toggleStatus` function also mutates the local `post.status` directly on the reactive list item without error handling — if `publishPost` or `unpublishPost` throws, the UI will show the wrong status. **Suggestion**: Add `.range(0, 99)` with pagination, and wrap `toggleStatus` in a try/catch that resets `post.status` on failure.

---

**File**: `app/composables/useAd.ts` | **Lines**: 28–35 | **Issue**: `useAd` calls `useSupabaseClient()` at the composable's setup root (line 25), before `onMounted`. In Nuxt 4 SSR, composables with `useSupabaseClient` at their root level run on the server side for SSR-rendered components, which would trigger an unauthenticated Supabase query from the server using the anon key. This is not necessarily harmful (ads are public) but means the ad query runs during SSR — which is wasted work since `onMounted` (line 37) is the only place `load()` is called, so the ad data is not available during SSR anyway. **Suggestion**: Move `const client = useSupabaseClient()` inside the `load` function to make intent explicit.

---

**File**: `app/middleware/admin.ts` | **Lines**: 5–12 | **Issue**: The middleware fires a Supabase `profiles` query on every navigation to any `/admin/*` route. This adds an extra round-trip for every admin page transition. Additionally, if the Supabase query fails (network timeout), `data` will be `undefined`, `data?.role` will be `undefined`, the check `!== 'admin'` will be `true`, and the admin will be silently redirected to `/` instead of seeing an error. **Suggestion**: Cache the profile in `useAuthStore` (already available via `auth.isAdmin`) instead of re-querying on every navigation, and add error handling for the fetch failure case.

---

**File**: `app/pages/posts/[slug].vue` | **Lines**: 46–63 | **Issue**: Two separate `onMounted` hooks are defined on consecutive lines (lines 46–51 and 56–63). Both are valid Vue 3 — multiple `onMounted` calls are allowed and both run — but the second hook contains an expensive Supabase `count` query and the first fires a tracking beacon. Having them split makes the lifecycle logic harder to follow at a glance. **Suggestion**: Consolidate into a single `onMounted` block with clearly commented sections.

---

**File**: `app/components/TemplateMenu.vue` | **Issue**: This component appears to be a scaffold/boilerplate artifact from the `@nuxt/ui` starter template — it links to `https://starter-template.nuxt.dev/`, `https://landing-template.nuxt.dev/`, etc. It is not imported or used anywhere in the actual application (no reference found in pages, layouts, or other components). **Suggestion**: Delete this file. It is dead code and may confuse future contributors.

---

### Info (nice to have / minor)

- **`supabase/schema.sql` lines 195, 200**: The `public read profiles` policy exposes all profile fields (including `bio`, `website`, `role`) to anonymous reads. Consider creating a view or using column-level security if you later want to hide the `role` field from public queries.

- **`supabase/schema.sql` line 213**: `authed_users_insert_tags` allows any authenticated user (not just writers or admins) to create tags. With an open registration model this could lead to tag spam. Consider restricting to `role IN ('writer', 'admin')`.

- **`app/pages/posts/[slug].vue` line 180**: The liked heart icon uses the same icon name for both liked and unliked states (`i-lucide-heart` for both branches). The `fill-rose-500` CSS class will not apply on an outline-only SVG icon — the result depends entirely on the icon set's SVG structure. Verify the icon renders filled when liked.

- **`app/pages/admin/users.vue` line 13**: The `toggleRole` function always toggles between `admin` and non-admin. There is no confirmation dialog before granting admin rights. A misclick can accidentally elevate any user to admin. Consider adding a confirmation step.

- **`nuxt.config.ts` line 27**: `supabase.redirect: false` disables the built-in redirect behavior. This is intentional based on the custom middleware approach, but it means the `@nuxtjs/supabase` module will not protect server routes. Ensure no server routes assume a Supabase-authenticated session from the module's built-in redirect guard.

- **`app/pages/write.vue` / `app/pages/edit/[slug].vue`**: The `coverUrl` field accepts a free-text URL with no validation. A user can enter any URL including `javascript:` or `data:` URIs. The image is rendered via `<img :src="coverUrl">` (no `v-html`, so no script execution), but an invalid URL will cause a broken image. Consider adding basic URL validation (must start with `https://`).

- **`server/api/track.post.ts` line 33–40, `click.post.ts` line 15–21, `impression.post.ts` line 15–21`**: All three routes silently swallow all exceptions from the Supabase insert (`catch { // Silent }`). While intentional to avoid blocking page render, this means Supabase quota errors, network failures, and schema mismatches are completely invisible in production. Add at minimum a server-side log: `console.error('[track] insert failed:', e)` inside the catch block so errors appear in Netlify function logs.

- **`app/pages/admin/analytics.vue` line 127**: The `loading` skeleton is shown after the stat cards are already rendered. On re-load (when `period` changes), the stat cards briefly show stale numbers while the loading skeleton shows below them. Consider resetting `stats.value` at the top of `load()` to avoid stale data display.

- **`app/pages/u/[username].vue` line 25`**: The complex `ReturnType<typeof store.fetchByAuthor> extends Promise<infer T> ? T : never` type inference for `posts` is overly complex. A simpler `Post[]` annotation would be clearer and equivalent.

---

## Next Steps

Prioritised action list:

1. **Install `isomorphic-dompurify` and add HTML sanitization** before the `v-html` binding in `app/pages/posts/[slug].vue`. This is the only XSS-class vulnerability and must be fixed before public launch.

2. **Add input validation to all three server API routes** (`track.post.ts`, `ads/click.post.ts`, `ads/impression.post.ts`) using `zod` or manual checks — at minimum UUID validation for `adId`/`post_id` and a 2 KB max length for `path`. Install `zod` (`npm i zod`) if not already present.

3. **Fix `useAnalytics.ts`** to guard `sessionStorage`/`navigator` with `import.meta.client` and register an `onUnmounted` cleanup for the `router.afterEach` listener.

4. **Replace `window.location.origin` in `app/stores/auth.ts`** with `useRequestURL().origin` in all four functions (`signInWithGoogle`, `signInWithGitHub`, `signInWithLinkedIn`, `requestPasswordReset`).

5. **Fix `toggleRole` in `app/pages/admin/users.vue`** — change the demote target from `'member'` to `'reader'` to match the schema enum. Update `shared/types/index.ts` `Profile.role` to `'reader' | 'writer' | 'admin'`.

6. **Fix `fetchBySlug` in `stores/posts.ts`** to not filter by `status = 'published'` when called from the edit page, so authors can edit their own drafts.

7. **Fix `fetchByAuthor` filter** in `stores/posts.ts` — either use `!inner` join or pre-resolve the profile ID to filter by `author_id`.

8. **Add `onUnmounted` cleanup for `IntersectionObserver`** in all four ad components as a leak-prevention fallback.

9. **Delete `app/components/TemplateMenu.vue`** — it is dead boilerplate not used anywhere in the project.

10. **Add `console.error` logging** inside the silent catch blocks in all three server routes so errors are visible in Netlify function logs without blocking the response.
