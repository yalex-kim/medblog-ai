# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Production build (Turbopack)
npm run lint     # Run ESLint
npm test         # Run vitest unit tests
```

Vitest covers `lib/session.ts`, `lib/parse-image-suggestions.ts`, `lib/rate-limit.ts`, and `lib/blog-credential-crypto.ts`. There is no end-to-end/integration test coverage for API routes or UI flows.

## Architecture

**MedBlog AI** is a Korean hospital blog SaaS (SaaS MVP) that generates medical blog posts and AI images for obstetrics/gynecology clinics, enforcing Korean medical advertising law.

### Tech Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Anthropic Claude (`claude-sonnet-4-5-20250929`) for blog text generation
- OpenAI DALL-E or Google Gemini for image generation (switchable via `IMAGE_PROVIDER` env var)
- Supabase for database (`hospitals`, `blog_posts`, `blog_images` tables) and Storage (`blog-images` bucket)

### Two-tier auth system
Sessions are HMAC-SHA256-signed JSON tokens (`base64url(payload).base64url(signature)`, signed with `SESSION_SECRET`) stored in HttpOnly cookies — see `lib/session.ts`. Two separate cookie names with different `type` fields:
- `session` cookie → hospital users (`/api/auth/*`, `/dashboard`, `/settings`), created/read via `createHospitalSessionToken`/`getSession`
- `admin_session` cookie → admin users (`/api/admin/*`, `/admin`), created/read via `createAdminSessionToken`/`getAdminSession`

All routes that require auth must use `getSession`/`getAdminSession` from `lib/session.ts` — do not re-implement cookie parsing locally. State-changing routes (`POST`/`PUT`) should also call `isTrustedOrigin` from `lib/request-security.ts` as defense-in-depth against CSRF, and login/generation endpoints should call `checkRateLimit` from `lib/rate-limit.ts` (in-memory, per-instance).

### Key data flows

**Blog generation** (`/api/generate-blog`):
1. Calls Claude API with a fixed system prompt (Korean medical blog rules + image suggestion format)
2. Claude embeds 5 image suggestions inline: `[#번호 | Type | 묘사 | text : 텍스트]`
3. Regex extracts `imageSuggestions[]` from content before saving to `blog_posts` table
4. Returns `{ content, imageKeywords, imageSuggestions[], blogPostId }`

**Image generation** (`/api/generate-images`):
1. Receives image suggestions (type + description + text overlay)
2. Routes to the active provider via `lib/image-providers/factory.ts` based on `IMAGE_PROVIDER` env var
3. `lib/image-prompts.ts` builds type-specific prompts using `PROMPT_TEMPLATES` (INTRO, MEDICAL, LIFESTYLE, WARNING, CTA, INFOGRAPHIC)
4. Uploads generated images to Supabase Storage, saves metadata to `blog_images` table with `display_order` and `prompt_id`

**Image provider abstraction** (`lib/image-providers/`):
- `types.ts` — `ImageGenerationProvider` interface
- `openai-provider.ts` / `gemini-provider.ts` — concrete implementations
- `factory.ts` — reads `IMAGE_PROVIDER` env var, returns the right provider

### Image suggestion format (embedded in blog content)

```
[#1 | INTRO | 장면 묘사]
[#2 | INFOGRAPHIC | 묘사 | text : 오버레이 텍스트]
```

INTRO and LIFESTYLE types have no `text` field. Parsing lives in `lib/parse-image-suggestions.ts` (shared by `generate-blog/route.ts` and `dashboard/page.tsx`) — change the format there, not inline.

### Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=          # signs session cookies (openssl rand -base64 48)
BLOG_CREDENTIAL_ENCRYPTION_KEY=  # encrypts hospitals' blog platform passwords at rest
ANTHROPIC_API_KEY=
IMAGE_PROVIDER=openai   # or 'gemini'
OPENAI_API_KEY=
GEMINI_API_KEY=
```

`SESSION_SECRET` and `BLOG_CREDENTIAL_ENCRYPTION_KEY` are required — routes that need them throw at request time if unset.

### Database setup

Run SQL files in Supabase SQL Editor in order:
1. `supabase-setup.sql` — `blog_images` table + Storage bucket setup
2. `supabase-migrations/create-admins-table.sql` — `admins` table (no default account is seeded; see `ADMIN_SETUP.md`)
3. `supabase-migrations/add-display-order.sql` — adds `display_order`, `image_type`, `prompt_id` to `blog_images`
4. `supabase-migrations/enable-rls.sql` — enables RLS (no permissive policies) on `hospitals`, `admins`, `blog_posts` as defense-in-depth
5. `supabase-migrations/add-references-and-trusted-domains.sql` — adds `hospitals.trusted_domains` and `blog_posts.reference_links`; without it `/api/blog-posts` returns 500 and generated posts fail to save
6. `supabase-migrations/rotate-default-admin.sql` — only needed if you deployed this app before the hardcoded default admin was removed

Note: the production database also has an `update_updated_at_column()` trigger function that is not defined in these files — it was created directly in Supabase. A database built only from the files above will not have it.

The app uses `supabaseAdmin` (service role key) for all server-side DB operations, bypassing RLS — RLS above is a safety net in case the anon key is ever used against these tables, not the primary access control. `supabase` (anon key) is available but currently unused server-side.

### Admin system

Hospitals are created by admins at `/admin`. Admin credentials use bcrypt hashing; there is no default/seeded admin account — create the first one with `node scripts/generate-admin-hash.js <username> <password>` and run the printed `INSERT`. See `ADMIN_SETUP.md` for full setup.

Hospital accounts have a `must_change_password` flag — if set, users are redirected to `/change-password` after login.
