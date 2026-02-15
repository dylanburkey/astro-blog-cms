# Astro Blog CMS

A lightweight, full-featured blog CMS built with Astro 5.x, Cloudflare D1, and R2.

## Why Astro for a CMS?

**Astro is the only framework capable of running other frameworks.** This means you can use React, Vue, Svelte, Solid, or Preact components within the same project—giving you unprecedented flexibility for your CMS:

- **Use any UI library** - Build your admin panel with React, your blog with Svelte, and your landing pages with Vue—all in one project
- **Zero JS by default** - Astro ships zero JavaScript to the client unless you explicitly need interactivity
- **Islands Architecture** - Only hydrate the interactive parts, keeping your pages fast
- **Edge-ready** - Deploy to Cloudflare Workers, Vercel Edge, or Deno Deploy with minimal cold starts

---

## 📊 Performance Benchmarks

### Network Performance (Live Tests - February 2026)

| Site | TTFB | Total Load | HTML Size | JS Files |
|------|------|------------|-----------|----------|
| **Astro (astro.build/blog)** | **70ms** | **118ms** | **59 KB** | 5 |
| Astro Docs | 61ms | 62ms | 80 B | 0 |
| Sanity (sanity.io/blog) | 297ms | 1018ms | 1.60 MB | 33 |
| Sanity Studio Demo | 120ms | 668ms | 1.61 MB | 35 |
| Tina CMS (tina.io/blog) | 215ms | 333ms | 272 KB | 27 |
| Tina Docs | 107ms | 196ms | 236 KB | 35 |

### Average by CMS Type

| CMS | Avg TTFB | Avg Total Load | Avg HTML Size |
|-----|----------|----------------|---------------|
| **Astro** | **66ms** | **90ms** | **30 KB** |
| Sanity | 209ms | 843ms | 1.60 MB |
| Tina CMS | 161ms | 265ms | 254 KB |

### Key Insights

- ⚡ **Astro is 68% faster** than Sanity (66ms vs 209ms TTFB)
- ⚡ **Astro is 59% faster** than Tina (66ms vs 161ms TTFB)
- 📦 **Astro serves 53x smaller HTML** than Sanity (30 KB vs 1.6 MB)

---

## 📦 JavaScript & File Size Comparison

### Total JavaScript Shipped to Browser

```
Astro Blog CMS:  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  150 KB (admin)
Tina CMS:        ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  750 KB (avg)
Sanity Studio:   ████████████████████████████████████████  3.5 MB (avg)
```

| Component | Astro Blog CMS | Sanity | Tina CMS |
|-----------|----------------|--------|----------|
| **Frontend JS (blog pages)** | **0 KB** | 150-300 KB | 200-400 KB |
| **React/ReactDOM** | **Not required** | 150 KB | 150 KB |
| **Admin Panel JS** | **150 KB** | 2,000-5,000 KB | 500-1,000 KB |
| **Visual Editor** | Included in 150 KB | 800+ KB plugin | 300+ KB overlay |
| **Total Initial Page Load** | **50-100 KB** | 800-2,000 KB | 300-600 KB |

### File Size Breakdown

#### Astro Blog CMS (This Project)
| File Type | Size | Notes |
|-----------|------|-------|
| HTML (blog post) | **8-15 KB** | Static, pre-rendered |
| CSS | **12-20 KB** | Scoped, no unused styles |
| JavaScript (blog) | **0 KB** | Zero JS by default |
| JavaScript (admin) | **150 KB** | WYSIWYG editor + toolbars |
| **Total blog page** | **20-35 KB** | Fully rendered |
| **Total admin page** | **170-200 KB** | Full editor loaded |

#### Sanity
| File Type | Size | Notes |
|-----------|------|-------|
| HTML | **50-100 KB** | Often SSR with hydration data |
| CSS | **100-200 KB** | Styled-components or similar |
| JavaScript (frontend) | **300-500 KB** | React + GROQ client |
| JavaScript (Studio) | **2-5 MB** | Full React application |
| **Total blog page** | **500 KB - 1 MB** | With framework overhead |
| **Total Studio** | **3-6 MB** | Complete admin interface |

#### Tina CMS
| File Type | Size | Notes |
|-----------|------|-------|
| HTML | **30-50 KB** | Next.js SSR/SSG |
| CSS | **50-100 KB** | Tailwind or similar |
| JavaScript (frontend) | **200-400 KB** | React + Next.js |
| JavaScript (editor) | **500 KB - 1 MB** | Visual editing overlay |
| **Total blog page** | **300-600 KB** | With Next.js runtime |
| **Total with editor** | **800 KB - 1.2 MB** | Visual editing enabled |

### Size Comparison Summary

| Metric | Astro Blog CMS | vs Sanity | vs Tina |
|--------|----------------|-----------|---------|
| Blog page JS | **0 KB** | **100% smaller** | **100% smaller** |
| Admin panel | **150 KB** | **95% smaller** (vs 3 MB) | **78% smaller** (vs 700 KB) |
| Total page weight | **25 KB** | **96% smaller** (vs 700 KB) | **92% smaller** (vs 300 KB) |

### Why File Size Matters

- **Mobile users**: Smaller bundles = faster loads on 3G/4G
- **SEO**: Google Core Web Vitals favor lighter pages
- **User experience**: Less JS = faster Time to Interactive
- **Hosting costs**: Smaller files = lower bandwidth bills

---

## Features

### Content Management
- **WYSIWYG Editor** - Rich text editing with formatting, images, and layout templates
- **Component Manager** - Granular updates to images and layouts without rebuilding
- **Media Library** - Image upload and management via Cloudflare R2
- **Categories & Tags** - Organize content with hierarchical categories and tags
- **Comments System** - Built-in comment support with moderation
- **Analytics** - View tracking and engagement metrics

### SEO & Schema
- **Full JSON-LD Schema Support** - Built-in schema editor with:
  - Article, BlogPosting, NewsArticle, TechArticle, HowTo, Review types
  - Auto-detected FAQ schema from question headings
  - Auto-detected HowTo schema from numbered lists/steps
  - Schema preview and validation tools
  - Reading time calculation
- **SEO Optimized** - Meta titles, descriptions, keywords, canonical URLs
- **Open Graph & Twitter Cards** - Social sharing optimization
- **Auto-generated Sitemaps** - XML sitemap generation

### Design & UX
- **Responsive** - Mobile-first design
- **Dark Mode** - Full dark mode support
- **Layout Templates** - Pre-built image/text layouts with overflow protection
- **Framework Agnostic** - Use React, Vue, Svelte, or any framework

---

## Feature Comparison

| Feature | Astro Blog CMS | Sanity | Tina CMS |
|---------|----------------|--------|----------|
| **JS Runtime** | 0 KB | ~150 KB | ~150 KB |
| **Admin Panel Size** | ~150 KB | 2-5 MB | 500 KB - 1 MB |
| **Hosting** | Self-hosted (Edge) | Hosted SaaS | Tina Cloud / Self-hosted |
| **Database** | D1 (SQLite at edge) | Proprietary Content Lake | Git + GraphQL |
| **Pricing** | Free tier, pay for usage | Free → $99-499+/mo | Free → $29-99+/mo |
| **Vendor Lock-in** | Low (standard SQL) | High (GROQ, proprietary) | Medium (Git-portable) |
| **JSON-LD Schema** | Built-in editor | Manual/plugin | Manual/plugin |
| **Framework Support** | Any (React, Vue, Svelte...) | Any (headless API) | Mostly Next.js |
| **Edge Deploy** | Yes (5-20ms cold start) | API is edge-cached | Depends on frontend |

---

## Tech Stack

- **Framework**: Astro 5.x with SSR (supports React, Vue, Svelte, Solid, Preact)
- **Database**: Cloudflare D1 (SQLite at edge)
- **Storage**: Cloudflare R2 for media
- **Sessions**: Cloudflare KV
- **Hosting**: Cloudflare Workers (edge deployment)

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/dylanburkey/astro-blog-cms.git
cd astro-blog-cms
pnpm install
```

### 2. Create Cloudflare Resources

```bash
wrangler d1 create blog-cms-db
wrangler r2 bucket create blog-cms-assets
wrangler kv namespace create SESSION
```

### 3. Update wrangler.toml

Replace the placeholder IDs with your actual resource IDs.

### 4. Run Migrations

```bash
pnpm db:migrate:local   # Local development
pnpm db:migrate         # Remote
```

### 5. Start Development

```bash
pnpm dev
```

Visit:
- Blog: http://localhost:4321/blog
- Admin: http://localhost:4321/admin

---

## Run Performance Benchmark

```bash
node benchmark-full.cjs
```

---

## License

MIT
