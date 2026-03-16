# Code Review — Phase 4 (SEO) & Phase 5 (Growth Features)

**Date:** 2026-03-14
**Reviewer:** Claude Opus 4.6
**Branch:** develop

## Summary

The Phase 4 and Phase 5 additions introduce SEO infrastructure (sitemap, RSS, OG images, JSON-LD), social sharing, reading progress, and a newsletter subscription flow. The code is generally well-structured and follows existing project conventions. However, there are several issues ranging from a critical XSS concern with `v-html` rendering, to SSR/hydration mismatches from unguarded browser API usage, weak email validation on the server, and missing `rel="nofollow"` on user-supplied social links that could be exploited.

---

## Files Reviewed

1. `server/api/sitemap.get.ts`
2. `server/routes/rss.xml.ts`
3. `server/api/newsletter/subscribe.post.ts`
4. `app/components/OgImage/KoPostOg.vue`
5. `app/components/post/PostShare.vue`
6. `app/components/post/ReadingProgress.vue`
7. `app/components/post/NewsletterCapture.vue`
8. `app/pages/posts/[slug].vue`
9. `app/pages/u/[username].vue`
10. `nuxt.config.ts`
11. `supabase/schema.sql`

---

## Critical

### C1 — XSS risk via `v-html` with incomplete sanitizer
**File:** `app/pages/posts/[slug].vue`, lines 110-131 (sanitizeHtml + v-html on line 247)
**Issue:** The `sanitizeHtml` function uses regex-based stripping of `<script>` tags, `on*` event handlers, and `javascript:` URIs. Regex-based HTML sanitization is fundamentally bypassable. Examples of bypasses:
- Attribute injection via backticks or encoded characters: `<img src=x onerror\x3dalert(1)>`
- `<svg onload=alert(1)>` with whitespace/encoding variations that dodge the regex
- `data:` URI scheme is not blocked (e.g., `<a href="data:text/html,...">`)
- `<iframe srcdoc="...">` is not blocked

The content comes from TipTap's `generateHTML`, which limits risk somewhat since TipTap only generates nodes for registered extensions. However, if the stored JSON is crafted maliciously (e.g., a compromised author account injects raw HTML nodes), the regex sanitizer will not reliably prevent XSS.

**Recommendation:** Replace the regex sanitizer with a proper HTML sanitization library such as `dompurify` (via `isomorphic-dompurify` for SSR) or `sanitize-html`. Alternatively, since TipTap controls the output schema, consider validating the JSON structure against expected node types before rendering instead of sanitizing the HTML output.

### C2 — Social links rendered without sanitization or protocol validation
**File:** `app/pages/u/[username].vue`, lines 37-40
**Issue:** The `twitter_url`, `linkedin_url`, `github_url`, and `website` fields are rendered directly into `<a href>` attributes with no protocol validation. A malicious user could set their profile URL to `javascript:alert(1)` and create a stored XSS vector. While modern browsers increasingly block `javascript:` in `<a href>`, this is not universally reliable.

**Recommendation:** Validate that all social link URLs start with `https://` or `http://` before rendering. Add server-side validation when profiles are updated, and add a client-side guard (e.g., filter out links that don't match `^https?://`).

---

## Warning

### W1 — `navigator.clipboard` used without `import.meta.client` guard or feature detection
**File:** `app/components/post/PostShare.vue`, lines 27-31
**Issue:** `navigator.clipboard.writeText()` is called without checking that it exists. This API is not available in all browsers (e.g., older mobile browsers, non-secure contexts). The function is only called on click so SSR is not a concern, but it will throw an unhandled exception if the API is unavailable.

**Recommendation:** Wrap in a try/catch or check `navigator.clipboard` existence before calling. Consider falling back to `document.execCommand('copy')` or showing a "copy not supported" message.

### W2 — `document` and `window` used in `<script setup>` without lifecycle guard
**File:** `app/components/post/ReadingProgress.vue`, lines 5-6, 9, 13-14
**Issue:** The `update()` function references `document.getElementById` and `window.innerHeight`. While it is only called inside `onMounted`/`onUnmounted` (which run client-side only), the function definition itself at module scope is fine. However, the `onUnmounted` cleanup references `update` which uses `window` — if somehow called during SSR teardown it would crash. This is a low-risk SSR concern but worth noting.

**Recommendation:** The current code is likely safe since `onMounted`/`onUnmounted` only fire client-side, but consider adding an `import.meta.client` guard around the lifecycle hooks for defensive coding, or use `useEventListener` from VueUse which handles cleanup automatically.

### W3 — Weak email validation on newsletter subscribe endpoint
**File:** `server/api/newsletter/subscribe.post.ts`, line 5
**Issue:** The validation `!email || !email.includes('@')` is extremely permissive. It accepts strings like `@`, `@@@@`, or `foo@` as valid emails. There is no length limit, no check for domain part, and no trimming before validation (though the client trims, an API caller may not).

**Recommendation:** Use a proper email regex (e.g., `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) or a validation library like `zod` or `validator.js`. Also trim the email server-side and enforce a max length (e.g., 320 characters) to prevent abuse.

### W4 — Newsletter subscribe endpoint uses `serverSupabaseClient` (anon key) — no rate limiting
**File:** `server/api/newsletter/subscribe.post.ts`
**Issue:** The endpoint has no rate limiting. An attacker could flood the `newsletter_subscribers` table with garbage emails via automated requests. The upsert with `ignoreDuplicates` prevents duplicate entries but not volume attacks with unique emails.

**Recommendation:** Add rate limiting via Nitro middleware, IP-based throttling, or a CAPTCHA for the subscribe form. At minimum, add a Turnstile/reCAPTCHA check.

### W5 — RSS feed hardcodes site URL instead of using environment variable
**File:** `server/routes/rss.xml.ts`, line 13
**Issue:** `const siteUrl = 'https://knowledgeorbit.sreeniverse.co.in'` is hardcoded, while `nuxt.config.ts` uses `process.env.NUXT_PUBLIC_SITE_URL` with the same value as fallback. This creates a maintenance mismatch — if the site URL changes, this file would be missed.

**Recommendation:** Use `useRuntimeConfig().public.siteUrl` (available in Nitro server routes) instead of the hardcoded string.

### W6 — Sitemap endpoint returns no error handling for Supabase failures
**File:** `server/api/sitemap.get.ts`
**Issue:** If the Supabase query fails, `data` will be `null` and the `error` object is silently ignored. The sitemap will return an empty array, which could cause search engines to de-index all posts during a transient database outage.

**Recommendation:** Check the `error` return from the Supabase call and throw a `500` error if the query fails. This way search engine crawlers receive an error status instead of an empty sitemap.

### W7 — `related` posts query uses `.in('post_tags.tag_id', tagIds)` — may not filter as expected
**File:** `app/pages/posts/[slug].vue`, lines 62-83
**Issue:** Using `.in()` on a nested join column (`post_tags.tag_id`) with Supabase's PostgREST API can behave unexpectedly — it may filter the nested `post_tags` rows returned rather than filtering the parent `posts` rows. This means unrelated posts could still appear in results (with their post_tags filtered to only matching ones), or posts with matching tags could be returned with incomplete tag data.

**Recommendation:** Verify the query returns the expected results. Consider using an RPC function or a different query strategy (e.g., query `post_tags` first to get post IDs, then fetch those posts) for reliable related-post filtering.

### W8 — `toggleLike` has no error handling
**File:** `app/pages/posts/[slug].vue`, lines 164-183
**Issue:** The `toggleLike` function does not wrap the Supabase insert/delete calls in try/catch. If the request fails, `likeCount` will be decremented/incremented incorrectly (optimistic update without rollback), and `likeLoading` will remain `true` forever since the finally block is missing.

**Recommendation:** Wrap in try/catch. On error, revert `likeCount` and `liked` to their previous values. Set `likeLoading = false` in a `finally` block.

### W9 — User profile posts fetched only in `onMounted` — no SSR for SEO
**File:** `app/pages/u/[username].vue`, lines 28-31
**Issue:** Posts are fetched in `onMounted`, meaning they won't be included in the SSR-rendered HTML. Search engines that don't execute JavaScript won't see the user's posts. The profile data itself is SSR'd via `useAsyncData`, but the post list is client-only.

**Recommendation:** Use `useAsyncData` for the posts fetch as well, similar to how `profile` is fetched. This ensures the post list is included in the initial SSR response.

### W10 — `rel="noopener"` missing `nofollow` on user-supplied social links
**File:** `app/pages/u/[username].vue`, line 62
**Issue:** Social links from user profiles use `rel="noopener"` but not `rel="nofollow"`. Since these URLs are user-supplied, they could be used for SEO spam (link farming). The PostShare component correctly uses `rel="noopener nofollow"`.

**Recommendation:** Add `nofollow` to the `rel` attribute: `rel="noopener nofollow"`.

---

## Minor

### M1 — Duplicate `const client = useSupabaseClient()` declaration
**File:** `app/pages/posts/[slug].vue`, lines 11 and 149
**Issue:** `useSupabaseClient()` is called and assigned to `client` at module scope (line 11) and again inside `onMounted` (line 149). The second declaration shadows the first within the `onMounted` scope. While not a bug, it's redundant.

**Recommendation:** Remove the `const client = useSupabaseClient()` on line 149 and use the module-scope `client` instead.

### M2 — Heavy use of `as any` type assertions
**File:** `app/pages/posts/[slug].vue`, lines 28, 36-37, 51, 63, 79-81, 87, 348-349
**File:** `app/pages/u/[username].vue`, line 35
**Issue:** Numerous `as any` casts indicate missing or incomplete TypeScript types for the Supabase query responses. This reduces type safety and makes it easier for bugs to slip through.

**Recommendation:** Define proper TypeScript interfaces for the post, profile, and related data shapes. Generate types from the Supabase schema using `supabase gen types typescript`.

### M3 — `StarterKit.configure({ link: false, underline: false })` — `underline` is not a StarterKit option
**File:** `app/pages/posts/[slug].vue`, line 122
**Issue:** StarterKit does not include an `underline` extension, so `underline: false` is a no-op configuration key. It won't cause an error but is misleading.

**Recommendation:** Remove `underline: false` from the StarterKit configuration since Underline is already registered as a separate extension.

### M4 — Like button uses same icon for liked/unliked states
**File:** `app/pages/posts/[slug].vue`, line 306
**Issue:** The ternary `liked ? 'i-lucide-heart' : 'i-lucide-heart'` evaluates to the same icon in both cases. The visual differentiation comes only from the CSS class `fill-rose-500` on line 308. This works but the ternary is misleading — it suggests the intent was to use different icons (e.g., `i-lucide-heart` vs `i-lucide-heart` outline).

**Recommendation:** Either use a filled heart variant for the liked state (if available in the icon set), or simplify the binding to just `:name="'i-lucide-heart'"` to avoid the misleading ternary.

### M5 — `posts` ref has a complex inferred type that defaults to `[]`
**File:** `app/pages/u/[username].vue`, line 25
**Issue:** `ref<ReturnType<typeof store.fetchByAuthor> extends Promise<infer T> ? T : never>([])` is an overly complex type annotation. If the return type of `fetchByAuthor` changes, this conditional type may break in confusing ways.

**Recommendation:** Define an explicit `Post[]` type and use `ref<Post[]>([])`.

### M6 — RSS feed missing caching headers
**File:** `server/routes/rss.xml.ts`
**Issue:** The RSS feed sets `Content-Type` but no caching headers. RSS readers and CDNs will fetch this on every request, causing unnecessary database queries.

**Recommendation:** Add `setResponseHeader(event, 'Cache-Control', 's-maxage=600, stale-while-revalidate=3600')` or configure caching via `routeRules` in `nuxt.config.ts` for the `/rss.xml` route.

### M7 — Newsletter `confirmed` column defaults to `false` but no confirmation flow exists
**File:** `supabase/schema.sql`, line 162
**Issue:** The `newsletter_subscribers` table has a `confirmed` boolean column defaulting to `false`, but neither the subscribe endpoint nor any other code sets it to `true`. There is no double opt-in / email confirmation flow implemented.

**Recommendation:** Either implement a confirmation email flow that sets `confirmed = true` upon verification, or remove the `confirmed` column if single opt-in is the intended behavior. If keeping it, document the planned confirmation flow as a TODO.

### M8 — `robots` sitemap URL is hardcoded
**File:** `nuxt.config.ts`, line 35
**Issue:** `sitemap: 'https://knowledgeorbit.sreeniverse.co.in/sitemap.xml'` is hardcoded while the `site.url` is configurable via env var. If the site URL changes, the robots sitemap URL would be stale.

**Recommendation:** Use a dynamic reference or template string: `` sitemap: `${process.env.NUXT_PUBLIC_SITE_URL || 'https://knowledgeorbit.sreeniverse.co.in'}/sitemap.xml` ``

---

## Clean

The following files have no issues worth flagging:

- **`app/components/OgImage/KoPostOg.vue`** — Simple presentational component, properly uses props, no security or SSR concerns.
- **`app/components/post/NewsletterCapture.vue`** — Clean form handling with proper loading/error/success states, uses `$fetch` correctly, input has `type="email"` and `required` attributes.
