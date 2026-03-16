# Code Review Round 2 — 2026-03-10

## Summary

Overall health is significantly improved from Round 1. Most fixes were applied correctly. However, **1 critical issue remains unresolved** (wrong enum value in `toggleRole`), **1 new warning was introduced** by the like-widget fix, and **3 additional issues** were found in fresh scanning. The codebase is close to deploy-ready but requires the enum fix before any role management is used in production.

---

## Fix Verification

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | XSS via `v-html` in `posts/[slug].vue` — `sanitizeHtml()` | VERIFIED | Inline `sanitizeHtml()` strips `<script>`, `on*` event attributes, and `javascript:` URIs. Applied correctly at line 29–34 and called at line 46. Note: see Info item below about sanitizer strength. |
| 2 | No input validation on server routes (`track`, `impression`, `click`) | PARTIAL | Presence checks added (`if (!path)`, `if (!adId)`). No type checking, length limiting, or UUID format validation on `adId`, `sessionId`, or `path`. Original concern partially addressed — still not robust. |
| 3 | `useAnalytics.ts` SSR crash + memory leak | VERIFIED | `import.meta.client` guards on both `getSessionId` and `track`. `onUnmounted` calls `removeAfterEach()`. Both fixes correctly applied. |
| 4 | `stores/auth.ts` `window.location.origin` — replaced with `getOrigin()` | VERIFIED | `getOrigin = () => import.meta.client ? window.location.origin : useRequestURL().origin` at line 21. Correctly SSR-safe. Used in all 3 OAuth methods and `requestPasswordReset`. |
| 5 | `IntersectionObserver` leak in all 4 ad components | VERIFIED | All four components (`AdInline`, `AdBanner`, `AdSidebar`, `AdEndOfPost`) have `onUnmounted(() => { observer.value?.disconnect() })`. Correctly applied. |
| 6 | `app/components/TemplateMenu.vue` — should be deleted | VERIFIED | File no longer exists. Glob search confirmed deletion. |
| 7 | `admin/users.vue` `toggleRole` `'member'` enum issue | **NOT FIXED** | Line 14 still sets `newRole = user.role === 'admin' ? 'member' : 'admin'`. The DB schema (`supabase/schema.sql` line 18) defines `user_role AS ENUM ('reader', 'writer', 'admin')` — `'member'` is not a valid value. This will cause a Postgres error on every demotion attempt. |
| 8 | `edit/[slug].vue` `fetchBySlug` 404 on drafts — `allowDraft=true` | VERIFIED | Line 17: `store.fetchBySlug(route.params.slug as string, true)`. The second argument `true` maps to `allowDraft` in the store. Fix correctly applied. |
| 9 | `stores/posts.ts` `fetchByAuthor` broken filter — two-step query | VERIFIED | Now does a profile lookup first, then filters posts by `author_id`. Correctly fixed. |
| 10 | `admin` middleware using `useSupabaseUser()` instead of `getUser()` | VERIFIED | `admin.ts` line 3: `const { data: { user } } = await client.auth.getUser()`. Correctly fixed. |
| 11 | `write.vue` `save()` using `useSupabaseUser()` instead of `getUser()` | VERIFIED | Line 52: `const { data: { user } } = await client.auth.getUser()`. Correctly fixed. |
| 12 | `stores/posts.ts` `fetchMyPosts` using `useSupabaseUser()` | VERIFIED | Line 63: `const { data: { user } } = await client.auth.getUser()`. Correctly fixed. |
| 13 | `posts/[slug].vue` likes widget SSR race (`user.value.id` undefined) | VERIFIED | `user` is no longer a top-level reactive ref. Both `onMounted` callback and `toggleLike()` now call `client.auth.getUser()` locally and guard on the result. No SSR race possible. |

---

## New Issues Found

### Critical

None introduced by the fixes themselves.

### Warning

**W1 — `admin/users.vue` `toggleRole` still uses invalid enum value `'member'` (Issue #7 was not fixed)**

File: `app/pages/admin/users.vue`, line 14
```
const newRole = user.role === 'admin' ? 'member' : 'admin'
```
The Postgres `user_role` enum is `('reader', 'writer', 'admin')`. Sending `'member'` will produce a DB error. Any logged-in admin who tries to demote a user will see a silent failure (no `try/catch` in `toggleRole`). The correct demotion value is `'reader'`.

**W2 — `edit/[slug].vue` author guard is bypassable when `author.id` is null**

File: `app/pages/edit/[slug].vue`, line 23
```
if (post.value.author?.id && user.value?.id && post.value.author.id !== user.value.id) {
```
The guard uses `&&` across all three conditions. If `post.value.author?.id` is falsy (author row missing or not joined), the entire condition evaluates to `false` and the guard is silently skipped — any authenticated user can then edit that post. Should use `||`-based inversion (throw if author id is missing OR if IDs don't match).

**W3 — `admin/users.vue` and `admin/posts.vue` `toggleRole`/`toggleStatus`/`remove` have no error handling**

Both admin files call async Supabase operations (update, delete, publishPost) with no `try/catch` wrappers. A network error or RLS rejection will produce an unhandled promise rejection that is invisible to the admin user. `dashboard.vue` correctly wraps these in `try/catch`; the admin pages do not.

**W4 — `AdBanner.vue` fires the click API handler twice on CTA button click**

File: `app/components/ad/AdBanner.vue`, lines 48 and 61
```html
<button @click="handleClick">           <!-- outer button -->
  <UButton @click.stop="handleClick" /> <!-- inner button -->
</button>
```
Clicking the `UButton` calls `handleClick` once (from `@click.stop="handleClick"`) and then propagation is stopped — so the outer `@click="handleClick"` does NOT fire. This means a click on the CTA button correctly fires once. However, clicking anywhere else on the outer button area (image, ad name, description text) fires `handleClick` but does NOT open the URL since `handleClick` calls `window.open` — wait, it does. So the actual bug is: clicking on the outer button area opens the URL correctly, but clicking the `UButton` also calls `window.open` once. The outer `@click` does not fire due to `.stop`. **The actual bug**: the outer `button` fires once when clicking outside the `UButton`, and the inner `UButton` fires once when clicking on it — both are correct. However, `@click.stop` on the inner `UButton` passes a Vue event modifier that Nuxt UI may not honor on its root element, meaning in some `@nuxt/ui` v4 versions the event propagates anyway and `handleClick` is called twice. This should be tested; if confirmed, the outer `button` click handler is redundant and should be removed in favour of the inner `UButton` alone.

### Info

**I1 — `sanitizeHtml` in `posts/[slug].vue` is a hand-rolled allowlist, not a hardened library**

The current sanitizer (lines 29–34) strips `<script>` tags and inline `on*` attributes with a regex. It does not handle:
- CSS-based XSS (e.g. `style="expression(...)"`)
- SVG-embedded payloads (`<svg onload=...>`)
- HTML entities used to bypass `on\w+` patterns (e.g. `&#111;nclick`)
- Nested `<script>` bypass: `<scr<script>ipt>`

Since the content goes through TipTap's `generateHTML`, which produces well-structured output, real-world risk is low — TipTap itself won't produce `<svg onload>`. However, if the content column is ever written directly via SQL or admin tooling, this sanitizer would not catch it. Recommend replacing with `dompurify` (client) or `isomorphic-dompurify` (SSR-compatible) for defence in depth.

**I2 — `write.vue` / `edit/[slug].vue` send fake tag IDs to the posts store**

In both write and edit pages, locally-created tags (typed into the tag input) are given `id: Date.now()` (a timestamp, not a real DB tag ID). These IDs are then sent to `store.createPost` / `store.updatePost` as `tag_ids`, which attempts to insert them into the `post_tags` table. If the tag doesn't exist in the `tags` table, the FK constraint will reject it. This is not a new bug introduced by the fixes, but it was missed in Round 1 and is a data-integrity issue. Tags should be resolved against the `tags` table (create if new) before submitting.

**I3 — `posts/[slug].vue` `likeCount` may display as `"[object Object]"` if Supabase returns aggregate as object**

Line 74:
```ts
const likeCount = ref(post.value?.likes?.[0]?.count ?? 0)
```
Supabase's `count` aggregate via `likes:likes(count)` returns `{ count: number }[]` not a flat number. The `.count` access should yield a number correctly — but the type is `any` at this point. If the schema or Supabase version changes the shape, `likeCount` could be `NaN` or `undefined`. Low risk currently but worth adding an explicit `Number(...)` cast.

**I4 — `auth.ts` middleware still uses `useSupabaseUser()` (client-only reactive ref)**

File: `app/middleware/auth.ts`, line 2; `app/middleware/guest.ts`, line 3
```ts
const user = useSupabaseUser()
if (!user.value) return navigateTo('/login')
```
`useSupabaseUser()` is a reactive ref that is populated from the client session cookie. During SSR, `user.value` may be `null` even for an authenticated user whose session hasn't hydrated yet. This is a known pattern in `@nuxtjs/supabase` v2 — the `auth` middleware is typically fine for client-side navigation, but on a hard refresh to a protected route, the SSR pass will redirect to `/login` before the client can hydrate. The `admin` middleware correctly uses `client.auth.getUser()` which makes a server-side API call. For full correctness, `auth.ts` and `guest.ts` should either use `getUser()` or be marked `client` middleware.

---

## Files with No Issues

- `app/composables/useAnalytics.ts` — clean, all guards correct
- `app/stores/posts.ts` — all previously flagged issues fixed, logic sound
- `app/stores/auth.ts` — clean, `getOrigin()` pattern is correct
- `app/pages/write.vue` — previously flagged `useSupabaseUser` fixed; logic correct (tag ID issue noted under I2 is pre-existing)
- `app/pages/dashboard.vue` — clean, proper error handling throughout
- `app/pages/admin/ads/index.vue` — clean
- `app/pages/admin/ads/[id].vue` — clean
- `app/pages/admin/analytics.vue` — clean, all data processing is read-only
- `server/api/track.post.ts` — logic correct, silent-fail appropriate
- `server/api/ads/impression.post.ts` — logic correct
- `server/api/ads/click.post.ts` — logic correct
- `app/components/ad/AdInline.vue` — clean
- `app/components/ad/AdSidebar.vue` — clean
- `app/components/ad/AdEndOfPost.vue` — clean

---

## Overall Assessment

**Not quite deploy-ready. One blocker remains.**

**Must fix before go-live:**
- `admin/users.vue` line 14: change `'member'` → `'reader'` to match the `user_role` Postgres enum. Every admin demotion will fail silently until this is fixed.

**Should fix before go-live:**
- `edit/[slug].vue` author guard logic (W2) — the `&&` bypass risk.
- Error handling in `admin/users.vue` and `admin/posts.vue` (W3) — admins get no feedback on failure.
- `app/middleware/auth.ts` and `guest.ts` using `useSupabaseUser()` (I4) — SSR hydration race on hard refresh to protected routes.

**Can defer post-launch:**
- `AdBanner.vue` double-click handler (W4) — test in browser first, may be a non-issue.
- Replace hand-rolled `sanitizeHtml` with `isomorphic-dompurify` (I1).
- Tag resolution against DB before insert (I2) — only affects users who type new tags.
- `likeCount` explicit cast (I3) — cosmetic risk only.

The core reading flow (post list, post page, SSR, analytics tracking, ad impressions) is solid. Auth store, admin middleware, and post CRUD are all in good shape after the Round 1 fixes.
