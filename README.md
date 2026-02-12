# Astro Blog CMS

A lightweight, self-hosted blog CMS for Astro + Cloudflare. No vendor lock-in, no monthly fees, no bloat.

**→ [Full Setup Guide](./examples/full-site/README.md)**

## Why This CMS?

| | Astro Blog CMS | Sanity / Contentful |
|---|---|---|
| **Setup** | Copy files, run migration | Account signup, API keys, webhooks |
| **Data ownership** | Your database | Their cloud |
| **Cost** | Free (Cloudflare free tier) | $$$ at scale |
| **Vendor lock-in** | None | Yes |
| **Dependencies** | Just Astro | Multiple SDKs |

## Features

- ✅ **WYSIWYG Editor** - Rich text with formatting, images, layouts
- ✅ **Image Uploads** - Direct to Cloudflare R2
- ✅ **Media Library** - Browse and manage uploads
- ✅ **Categories & Tags** - Organize your content
- ✅ **User Management** - Multiple admins with roles
- ✅ **SEO Fields** - Meta titles, descriptions, Open Graph
- ✅ **Settings Panel** - Configure without code
- ✅ **Dark Theme** - Easy on the eyes

## Tech Stack

- **Astro** 5.x with SSR
- **Cloudflare Workers** runtime
- **Cloudflare D1** database (SQLite at edge)
- **Cloudflare R2** storage (S3-compatible)

## Quick Start

```bash
# 1. Install
pnpm add @dylanburkey/astro-blog-cms

# 2. Copy admin pages to your project
cp -r node_modules/@dylanburkey/astro-blog-cms/src/pages/admin src/pages/
cp -r node_modules/@dylanburkey/astro-blog-cms/src/layouts src/
cp -r node_modules/@dylanburkey/astro-blog-cms/src/lib src/

# 3. Run database migrations
wrangler d1 execute YOUR_DB --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0001_blog_schema.sql
wrangler d1 execute YOUR_DB --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0002_blog_engagement.sql
wrangler d1 execute YOUR_DB --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0003_settings_table.sql

# 4. Start dev server
pnpm dev

# 5. Visit http://localhost:4321/admin
```

**For a complete walkthrough, see the [Full Site Example](./examples/full-site/).**

## Admin Routes

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard |
| `/admin/blog` | Manage posts |
| `/admin/blog/new` | Create post |
| `/admin/blog/categories` | Manage categories |
| `/admin/blog/tags` | Manage tags |
| `/admin/media` | Media library |
| `/admin/users` | User management |
| `/admin/settings` | Site settings |

## Customization

### Theming

```astro
<AdminLayout 
  title="Posts"
  siteName="My Blog"
  logoPath="/logo.png"
  theme={{
    background: '#0f172a',
    primary: '#3b82f6',
    surface: '#1e293b'
  }}
/>
```

### Theme Presets

```typescript
import { defaultTheme, lightTheme, blueTheme, greenTheme } from '@dylanburkey/astro-blog-cms';
```

## TypeScript

```typescript
import { 
  type BlogPost,
  type CMSSettings,
  getSettings,
  generateSlug,
  formatDate,
  paths 
} from '@dylanburkey/astro-blog-cms';

// Get settings
const settings = await getSettings(db);

// Generate URL-friendly slug
const slug = generateSlug("My Post Title"); // "my-post-title"

// Path helpers
const editUrl = paths.admin.blog.edit(123); // "/admin/blog/edit/123"
```

## Database Schema

```
admin_users        - Admin accounts (email, password, role)
admin_sessions     - Login sessions
blog_posts         - Post content and metadata
blog_categories    - Hierarchical categories
blog_tags          - Flat tags
blog_media         - Uploaded files
blog_views         - View analytics
blog_comments      - User comments
cms_settings       - Site configuration
```

## Project Structure

```
your-project/
├── src/
│   ├── pages/
│   │   ├── admin/          # CMS admin (copied from package)
│   │   │   ├── blog/
│   │   │   ├── media/
│   │   │   ├── users/
│   │   │   ├── settings/
│   │   │   └── api/
│   │   ├── blog/           # Your public blog pages
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── index.astro
│   ├── layouts/
│   │   └── AdminLayout.astro
│   └── lib/
│       └── auth.ts
├── wrangler.toml
└── package.json
```

## Examples

- **[Full Site Example](./examples/full-site/)** - Complete blog with admin CMS
- **[Basic Example](./examples/basic/)** - Minimal setup

## License

MIT License - Use freely in personal and commercial projects.

## Author

Created by [Dylan Burkey](https://github.com/dylanburkey)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.
