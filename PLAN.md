# Knowledge Orbit v2 — Master Plan

## Overview

A Nuxt 4 + Supabase multi-author blog platform with:
- Custom ad management + affiliate monetization (Amazon Associates, CashKaro, CRED UPI)
- Supabase-based custom analytics
- Full SSR for SEO
- Admin panel: posts, users, tags, series, ads, analytics
- Hosted at knowledgeorbit.sreeniverse.co.in

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Nuxt 4 (v4.3+) | SSR, Nuxt 3 EOL Jul 2026, better TS, faster |
| UI | @nuxt/ui v4 | 125+ free components, built-in TipTap Editor, Tailwind v4 |
| Backend | Supabase (existing HunterSreeni org) | Auth, DB, Storage, Realtime |
| Auth module | @nuxtjs/supabase v2 | Nuxt 4 ready, SSR cookies, OAuth PKCE |
| State | @pinia/nuxt | Same Pinia, Nuxt 4 module |
| SEO | @nuxtjs/seo | OG images, sitemap, robots, structured data |
| Charts | Chart.js (via vue-chartjs) | Lightweight, no external service |
| Hosting | Netlify | Branch deploys for staging |

## Domain & Deployment

- Production: knowledgeorbit.sreeniverse.co.in
  - GoDaddy DNS: CNAME knowledgeorbit → [netlify-site].netlify.app
- Staging: develop--knowledge-orbit-v2.netlify.app (auto on `develop` branch push)
- Netlify site: knowledge-orbit-v2

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Nuxt 4 Foundation | DONE |
| 2 | Ad System + Monetization | DONE |
| 3 | Custom Analytics | DONE |
| 4 | SEO | DONE |
| 5 | Growth Features | DONE |

## Supabase Project

- Org: HunterSreeni (tzgbkdqjlvzaiocbkvzc)
- Project: knowledge-orbit (to be created in Phase 1)
- Region: ap-south-1 (same as ISTQB for latency)
- Schema file: supabase/schema.sql (combined from v1 + new ad/analytics tables)

## Directory Structure (Nuxt 4 app/)

```
knowledge-orbit-v2/
├── app/
│   ├── assets/
│   ├── components/
│   │   ├── ad/            # AdInline, AdBanner, AdEndOfPost, AdSidebar
│   │   ├── editor/        # PostEditor wrapper around UEditor
│   │   ├── post/          # PostCard, LikeButton, TagBadge, ReadingProgress
│   │   └── ui/            # NavBar, ThemeToggle, etc.
│   ├── composables/
│   │   ├── useAd.ts       # Ad rotation + impression tracking
│   │   ├── useAnalytics.ts # Page view tracking
│   │   ├── useSlug.ts
│   │   └── useTheme.ts
│   ├── layouts/
│   │   ├── default.vue    # NavBar + footer
│   │   └── admin.vue      # Admin sidebar layout
│   ├── middleware/
│   │   ├── auth.ts        # Redirect to /login if not authed
│   │   └── admin.ts       # Redirect to / if not admin
│   ├── pages/
│   │   ├── index.vue      # Feed (infinite scroll)
│   │   ├── login.vue
│   │   ├── write.vue      # New post
│   │   ├── edit/[slug].vue
│   │   ├── dashboard.vue
│   │   ├── posts/[slug].vue
│   │   ├── u/[username].vue
│   │   ├── tags/[slug].vue
│   │   ├── series/[slug].vue
│   │   ├── search.vue
│   │   └── admin/
│   │       ├── index.vue       # Stats overview
│   │       ├── posts.vue
│   │       ├── users.vue
│   │       ├── tags.vue
│   │       ├── series.vue
│   │       ├── ads/
│   │       │   ├── index.vue   # Ad list + performance
│   │       │   └── [id].vue    # Create / edit ad
│   │       └── analytics.vue   # Charts dashboard
│   ├── plugins/
│   └── app.vue
├── server/
│   ├── api/
│   │   ├── track.post.ts  # Page view tracking endpoint
│   │   └── ads/
│   │       ├── impression.post.ts
│   │       └── click.post.ts
│   └── utils/
│       └── supabase.ts    # Server-side Supabase client
├── shared/
│   └── types/
│       └── index.ts       # Shared TS interfaces
├── supabase/
│   └── schema.sql         # Full DB schema (run in Supabase SQL editor)
├── public/
├── nuxt.config.ts
├── tailwind.config.ts
├── netlify.toml
├── .env
└── .env.example
```

## Notes

- All OAuth: Google (already set up in Supabase), GitHub + LinkedIn (Phase 1 TODO)
- TipTap via Nuxt UI's UEditor component (SSR safe, no extra config)
- Ads are injected into post content after every N paragraphs (configurable)
- Affiliate disclosure shown automatically when an ad component renders
- Analytics tracking fires from server route (no client JS, no adblocker issues)
- No Google AdSense, no ad network constraints — full creative control
