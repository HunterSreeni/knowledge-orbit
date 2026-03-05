# Phase 1 — Nuxt 4 Foundation

## Goal
Get a fully working Nuxt 4 blog running on Netlify staging with:
- All pages from v1 migrated
- Supabase auth (Google OAuth working, GitHub + LinkedIn wired)
- SSR with cookie-based sessions
- Admin panel (posts/users/tags/series)
- Dark/light theme

## Step 1 — Scaffold Nuxt 4 Project

```bash
cd /home/huntersreeni/Documents/Personal
npx nuxi@latest init knowledge-orbit-v2 --template ui
cd knowledge-orbit-v2
npm install
```

The `--template ui` flag bootstraps with @nuxt/ui v4 pre-configured.

## Step 2 — Install Modules

```bash
npm install @nuxtjs/supabase @pinia/nuxt @nuxtjs/seo
npm install -D vue-chartjs chart.js
```

## Step 3 — nuxt.config.ts

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/seo',
  ],

  supabase: {
    redirect: false,  // we handle redirects manually via middleware
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/posts/*', '/u/*', '/tags/*', '/search', '/series/*'],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true,
    },
  },

  seo: {
    // configured per-page via useSeoMeta
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://knowledgeorbit.sreeniverse.co.in',
      siteName: 'Knowledge Orbit',
      siteDescription: 'Diverse perspectives on anime, AI/LLM, security, and more.',
    },
  },
})
```

## Step 4 — Environment Variables

`.env`:
```
SUPABASE_URL=https://[new-project-ref].supabase.co
SUPABASE_KEY=[anon-key]
NUXT_PUBLIC_SITE_URL=https://knowledgeorbit.sreeniverse.co.in
```

`.env.example` (commit this, not .env):
```
SUPABASE_URL=
SUPABASE_KEY=
NUXT_PUBLIC_SITE_URL=
```

Note: @nuxtjs/supabase uses SUPABASE_URL and SUPABASE_KEY (not VITE_ prefix).

## Step 5 — Create Supabase Project

Via Supabase MCP or dashboard:
- Name: knowledge-orbit
- Org: HunterSreeni
- Region: ap-south-1
- Then apply supabase/schema.sql

## Step 6 — Supabase Schema

Full schema in `supabase/schema.sql`. Tables:
- profiles (id, username, full_name, avatar_url, bio, website, role, created_at)
- series (id, author_id, title, description, slug, created_at)
- posts (id, author_id, series_id, title, slug, content jsonb, cover_image_url, excerpt, status, reading_time_mins, published_at, created_at, updated_at, search_vector)
- tags (id serial, name, slug)
- post_tags (post_id, tag_id)
- likes (id serial, post_id, user_id, created_at)

Phase 2 adds: ads, ad_events
Phase 3 adds: page_views

## Step 7 — Auth Setup (Supabase Dashboard)

Google OAuth (already configured — verify callback URL):
- Supabase → Auth → Providers → Google
- Callback URL: https://[project-ref].supabase.co/auth/v1/callback
- Also add to Google Cloud Console → Authorized Redirect URIs

GitHub OAuth:
- GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
- Homepage URL: https://knowledgeorbit.sreeniverse.co.in
- Authorization callback URL: https://[project-ref].supabase.co/auth/v1/callback
- Paste Client ID + Secret into Supabase → Auth → Providers → GitHub

LinkedIn OAuth:
- LinkedIn Developer Console → Create App
- Redirect URL: https://[project-ref].supabase.co/auth/v1/callback
- Paste Client ID + Secret into Supabase → Auth → Providers → LinkedIn

Supabase → Auth → URL Configuration:
- Site URL: https://knowledgeorbit.sreeniverse.co.in
- Redirect URLs:
  - https://knowledgeorbit.sreeniverse.co.in/**
  - http://localhost:3000/**
  - https://develop--knowledge-orbit-v2.netlify.app/**

## Step 8 — Auth Callback Page

Create `app/pages/confirm.vue` to handle OAuth PKCE exchange:

```vue
<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

onMounted(async () => {
  // @nuxtjs/supabase handles the token exchange automatically
  // just redirect after
  await router.push('/')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Signing you in...</p>
  </div>
</template>
```

## Step 9 — Layouts

`app/layouts/default.vue` — NavBar + footer, theme toggle
`app/layouts/admin.vue` — Sidebar with links to admin sections

## Step 10 — Middleware

`app/middleware/auth.ts`:
```ts
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo('/login')
})
```

`app/middleware/admin.ts`:
```ts
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  if (!user.value) return navigateTo('/login')
  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .single()
  if (data?.role !== 'admin') return navigateTo('/')
})
```

## Step 11 — Migrate All Pages

Pages to create (adapt from v1 Vue SPA):

| Route | File | Notes |
|---|---|---|
| / | pages/index.vue | Feed, infinite scroll |
| /login | pages/login.vue | Google/GitHub/LinkedIn/Email |
| /confirm | pages/confirm.vue | OAuth callback |
| /posts/[slug] | pages/posts/[slug].vue | SSR, useSeoMeta |
| /u/[username] | pages/u/[username].vue | Author profile |
| /tags/[slug] | pages/tags/[slug].vue | Tag feed |
| /series/[slug] | pages/series/[slug].vue | Series view |
| /search | pages/search.vue | Full-text |
| /write | pages/write.vue | requireAuth |
| /edit/[slug] | pages/edit/[slug].vue | requireAuth |
| /dashboard | pages/dashboard.vue | requireAuth |
| /admin | pages/admin/index.vue | requireAdmin |
| /admin/posts | pages/admin/posts.vue | requireAdmin |
| /admin/users | pages/admin/users.vue | requireAdmin |
| /admin/tags | pages/admin/tags.vue | requireAdmin |
| /admin/series | pages/admin/series.vue | requireAdmin |
| /admin/ads | pages/admin/ads/index.vue | requireAdmin (Phase 2) |
| /admin/analytics | pages/admin/analytics.vue | requireAdmin (Phase 3) |

## Step 12 — Stores (Pinia)

- `app/stores/auth.ts` — session, profile, isAdmin, sign in/out methods
- `app/stores/posts.ts` — feed, fetchBySlug, fetchByTag, search, CRUD

## Step 13 — Key Components

- `NavBar.vue` — sticky, auth state aware, dark/light toggle
- `PostCard.vue` — cover, title, excerpt, author, tags, likes
- `PostEditor.vue` — wrapper around Nuxt UI's `<UEditor>` (TipTap SSR safe)
- `LikeButton.vue` — toggle with optimistic count
- `TagBadge.vue` — clickable link to tag page

## Step 14 — Netlify Config

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

Wait — Nuxt 4 on Netlify uses Netlify Functions for SSR.
Use `@nuxtjs/netlify-edge` or configure preset:

`nuxt.config.ts`:
```ts
nitro: {
  preset: 'netlify'
}
```

Build output goes to `.output/` and Netlify auto-detects Nuxt.

## Step 15 — Git + Deploy

```bash
cd knowledge-orbit-v2
git init
git checkout -b develop
git add .
git commit -m "feat: Nuxt 4 foundation - scaffold + auth + all pages migrated"
# Push to GitHub repo: HunterSreeni/knowledge-orbit-v2
git remote add origin git@github.com:HunterSreeni/knowledge-orbit-v2.git
git push -u origin develop
```

Then in Netlify dashboard:
- New site from git → knowledge-orbit-v2 repo
- Build command: `npm run build`
- Publish dir: `.output/public`
- Add env vars: SUPABASE_URL, SUPABASE_KEY, NUXT_PUBLIC_SITE_URL
- Auto-deploy on `develop` branch → staging URL
- Set `main` branch → production → add custom domain knowledgeorbit.sreeniverse.co.in

## Step 16 — GoDaddy DNS

Add CNAME record:
- Name: knowledgeorbit
- Value: [netlify-site].netlify.app
- TTL: 600

## Phase 1 Completion Checklist

- [ ] Nuxt 4 project scaffolded
- [ ] @nuxt/ui v4 working
- [ ] Supabase project created under HunterSreeni org
- [ ] Schema applied
- [ ] Google OAuth working (verify callback URL)
- [ ] GitHub OAuth wired
- [ ] LinkedIn OAuth wired
- [ ] All public pages rendering (SSR verified)
- [ ] Auth pages working (login/logout/protected routes)
- [ ] Admin panel accessible (posts/users/tags/series)
- [ ] Post editor working with UEditor (TipTap)
- [ ] Dark/light theme
- [ ] Staging deployed to Netlify
- [ ] knowledgeorbit.sreeniverse.co.in CNAME added
