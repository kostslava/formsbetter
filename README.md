# FormsBetter

FormsBetter is a Google Forms look-alike app built with Next.js + Supabase.

It includes:

- Visual form builder
- Theme selection
- Question types: short text, paragraph, image block
- Image upload to Supabase Storage
- Short share URLs
- QR code for each published form
- Public response page
- Creator-only response dashboard
- CSV export

## Tech Stack

- Next.js 16 App Router
- Tailwind CSS
- Supabase (Postgres + Storage)

## 1) Supabase Setup

Create a new Supabase project, then run this SQL in the SQL Editor:

```sql
create extension if not exists pgcrypto;

create table if not exists forms (
	id uuid primary key default gen_random_uuid(),
	creator_token text not null,
	title text not null,
	description text not null default '',
	short_code text not null unique,
	theme_id text not null default 'orchid',
	fields jsonb not null,
	created_at timestamptz not null default now()
);

create index if not exists forms_creator_token_idx on forms(creator_token);

create table if not exists responses (
	id uuid primary key default gen_random_uuid(),
	form_id uuid not null references forms(id) on delete cascade,
	answers jsonb not null,
	created_at timestamptz not null default now()
);

create index if not exists responses_form_id_idx on responses(form_id);
```

Create a Storage bucket in Supabase Storage:

- Bucket name: `form-images`
- Public bucket: `ON`

## 2) Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_FORMS_BUCKET` (default `form-images`)

## 3) Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4) Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. In Vercel project settings, add all env vars from `.env.local`.
4. Deploy.

## Notes on Creator Access

This app uses a local creator token in browser storage (no login flow required). The token is used by API routes to scope dashboard and response access to the form creator.
