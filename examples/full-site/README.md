# Full Site Example

A complete blog site with Astro Blog CMS. Follow this guide to set up your own self-hosted blog with a full admin panel.

## Prerequisites

- Node.js 18+
- pnpm (recommended)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Step 1: Create Your Project

```bash
# Create a new directory
mkdir my-blog && cd my-blog

# Initialize package.json
pnpm init

# Install dependencies
pnpm add astro @astrojs/cloudflare @dylanburkey/astro-blog-cms
pnpm add -D wrangler typescript
```

## Step 2: Project Structure

Create these files:

```
my-blog/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   └── blog/
│   │       ├── index.astro      # Blog listing
│   │       └── [slug].astro     # Single post
│   ├── layouts/
│   │   └── BaseLayout.astro     # Site layout
│   └── styles/
│       └── global.css           # Global styles
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── wrangler.toml
├── tsconfig.json
└── package.json
```

## Step 3: Configure Astro

Create `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    runtime: {
      mode: 'local',
      type: 'pages',
    },
  }),
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

## Step 4: Set Up Cloudflare Resources

### Create D1 Database

```bash
# Create database
wrangler d1 create my-blog-db

# Note the database_id from the output
```

### Create R2 Bucket

```bash
# Create bucket for images
wrangler r2 bucket create my-blog-images
```

### Configure wrangler.toml

```toml
name = "my-blog"
compatibility_date = "2024-01-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "my-blog-db"
database_id = "YOUR_DATABASE_ID"  # From step above

[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "my-blog-images"
```

## Step 5: Run Database Migrations

```bash
# Create tables
wrangler d1 execute my-blog-db --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0001_blog_schema.sql

wrangler d1 execute my-blog-db --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0002_blog_engagement.sql

wrangler d1 execute my-blog-db --file=node_modules/@dylanburkey/astro-blog-cms/migrations/0003_settings_table.sql
```

## Step 6: Copy CMS Files

```bash
# Copy admin pages
cp -r node_modules/@dylanburkey/astro-blog-cms/src/pages/admin src/pages/

# Copy layouts
cp -r node_modules/@dylanburkey/astro-blog-cms/src/layouts src/

# Copy lib (auth, settings)
cp -r node_modules/@dylanburkey/astro-blog-cms/src/lib src/

# Copy components
cp -r node_modules/@dylanburkey/astro-blog-cms/src/components src/

# Copy styles
cp -r node_modules/@dylanburkey/astro-blog-cms/src/styles src/
```

## Step 7: Create Your First Admin User

Create a script `scripts/create-admin.js`:

```javascript
// Run with: node scripts/create-admin.js

const password = 'your-secure-password';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  const saltAndHash = new Uint8Array(salt.length + hashArray.length);
  saltAndHash.set(salt);
  saltAndHash.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...saltAndHash));
}

hashPassword(password).then(hash => {
  console.log('\n📋 Run this command to create your admin user:\n');
  console.log(`wrangler d1 execute my-blog-db --command="INSERT INTO admin_users (email, password_hash, name, role) VALUES ('admin@example.com', '${hash}', 'Admin', 'admin')"`);
  console.log('\n');
});
```

Run it:

```bash
node scripts/create-admin.js
# Then run the outputted wrangler command
```

## Step 8: Create Public Pages

### Homepage (`src/pages/index.astro`)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';

const db = Astro.locals.runtime?.env?.DB;
let recentPosts = [];

if (db) {
  const result = await db.prepare(`
    SELECT id, slug, title, excerpt, cover_image, published_at
    FROM blog_posts 
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT 5
  `).all();
  recentPosts = result.results || [];
}
---

<BaseLayout title="Home">
  <section class="hero">
    <h1>Welcome to My Blog</h1>
    <p>Thoughts, tutorials, and more.</p>
  </section>

  <section class="recent-posts">
    <h2>Recent Posts</h2>
    {recentPosts.length === 0 ? (
      <p>No posts yet. <a href="/admin/blog/new">Create your first post →</a></p>
    ) : (
      <ul class="post-list">
        {recentPosts.map(post => (
          <li>
            <a href={`/blog/${post.slug}`}>
              <h3>{post.title}</h3>
              {post.excerpt && <p>{post.excerpt}</p>}
            </a>
          </li>
        ))}
      </ul>
    )}
    <a href="/blog" class="view-all">View all posts →</a>
  </section>
</BaseLayout>
```

### Blog Listing (`src/pages/blog/index.astro`)

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getSettings } from '../../lib/settings';

const db = Astro.locals.runtime?.env?.DB;
let posts = [];
let settings = { posts_per_page: 10 };

if (db) {
  settings = await getSettings(db);
  
  const result = await db.prepare(`
    SELECT 
      p.id, p.slug, p.title, p.excerpt, p.cover_image, 
      p.published_at, p.content,
      u.name as author_name
    FROM blog_posts p
    LEFT JOIN admin_users u ON p.author_id = u.id
    WHERE p.status = 'published'
    ORDER BY p.published_at DESC
    LIMIT ?
  `).bind(settings.posts_per_page).all();
  
  posts = result.results || [];
}
---

<BaseLayout title="Blog">
  <h1>Blog</h1>
  
  {posts.length === 0 ? (
    <p>No posts yet.</p>
  ) : (
    <div class="posts-grid">
      {posts.map(post => (
        <article class="post-card">
          {post.cover_image && (
            <img src={post.cover_image} alt={post.title} />
          )}
          <div class="post-content">
            <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
            {post.excerpt && <p>{post.excerpt}</p>}
            <footer>
              <span>{post.author_name || 'Anonymous'}</span>
              <time>{new Date(post.published_at).toLocaleDateString()}</time>
            </footer>
          </div>
        </article>
      ))}
    </div>
  )}
</BaseLayout>
```

### Single Post (`src/pages/blog/[slug].astro`)

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import '../../styles/blog-content.css';

const { slug } = Astro.params;
const db = Astro.locals.runtime?.env?.DB;

let post = null;
let notFound = false;

if (db && slug) {
  post = await db.prepare(`
    SELECT 
      p.*,
      u.name as author_name,
      u.avatar as author_avatar
    FROM blog_posts p
    LEFT JOIN admin_users u ON p.author_id = u.id
    WHERE p.slug = ? AND p.status = 'published'
  `).bind(slug).first();
  
  if (!post) {
    notFound = true;
  } else {
    // Track view
    await db.prepare(`
      INSERT INTO blog_views (post_id, ip_address, user_agent)
      VALUES (?, ?, ?)
    `).bind(post.id, Astro.request.headers.get('cf-connecting-ip'), Astro.request.headers.get('user-agent')).run();
  }
}

if (notFound) {
  return Astro.redirect('/404');
}
---

<BaseLayout 
  title={post?.title || 'Post'} 
  description={post?.meta_description || post?.excerpt}
  image={post?.og_image || post?.cover_image}
>
  <article class="blog-post">
    {post?.cover_image && (
      <img src={post.cover_image} alt={post.title} class="cover-image" />
    )}
    
    <header>
      <h1>{post?.title}</h1>
      <div class="meta">
        <span class="author">{post?.author_name || 'Anonymous'}</span>
        <time>{new Date(post?.published_at).toLocaleDateString()}</time>
      </div>
    </header>
    
    <div class="blog-content" set:html={post?.content} />
  </article>
  
  <a href="/blog">← Back to Blog</a>
</BaseLayout>
```

### Base Layout (`src/layouts/BaseLayout.astro`)

```astro
---
export interface Props {
  title: string;
  description?: string;
  image?: string;
}

const { title, description, image } = Astro.props;
const siteTitle = 'My Blog';
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | {siteTitle}</title>
  {description && <meta name="description" content={description} />}
  
  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  {description && <meta property="og:description" content={description} />}
  {image && <meta property="og:image" content={image} />}
  
  <link rel="stylesheet" href="/styles/global.css" />
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="/" class="logo">{siteTitle}</a>
      <ul>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/admin">Admin</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <slot />
  </main>
  
  <footer class="site-footer">
    <p>&copy; {new Date().getFullYear()} {siteTitle}</p>
  </footer>
</body>
</html>
```

### Global Styles (`src/styles/global.css`)

```css
:root {
  --color-bg: #0a0a0a;
  --color-text: #ffffff;
  --color-muted: #888888;
  --color-primary: #6366f1;
  --color-surface: #1a1a1a;
  --color-border: #333333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.site-header {
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
}

.site-header nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.site-header .logo {
  font-weight: bold;
  font-size: 1.25rem;
  color: var(--color-text);
}

.site-header ul {
  display: flex;
  gap: 2rem;
  list-style: none;
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.site-footer {
  border-top: 1px solid var(--color-border);
  padding: 2rem;
  text-align: center;
  color: var(--color-muted);
}

/* Blog styles */
.posts-grid {
  display: grid;
  gap: 2rem;
}

.post-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.post-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-card .post-content {
  padding: 1.5rem;
}

.post-card h2 {
  margin-bottom: 0.5rem;
}

.post-card footer {
  display: flex;
  justify-content: space-between;
  color: var(--color-muted);
  font-size: 0.875rem;
  margin-top: 1rem;
}

.blog-post .cover-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}

.blog-post header {
  margin-bottom: 2rem;
}

.blog-post h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.blog-post .meta {
  color: var(--color-muted);
  display: flex;
  gap: 1rem;
}
```

## Step 9: Update package.json

```json
{
  "name": "my-blog",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler pages dev ./dist",
    "deploy": "astro build && wrangler pages deploy ./dist"
  }
}
```

## Step 10: Run Your Blog

```bash
# Start dev server
pnpm dev

# Open http://localhost:4321
# Admin panel at http://localhost:4321/admin
```

## Step 11: Deploy to Cloudflare Pages

```bash
# Build and deploy
pnpm deploy
```

## That's It! 🎉

You now have:

- ✅ A self-hosted blog
- ✅ Full admin panel at `/admin`
- ✅ WYSIWYG editor
- ✅ Image uploads to R2
- ✅ Categories and tags
- ✅ User management
- ✅ SEO-friendly pages

### Next Steps

- Customize the theme in `AdminLayout.astro`
- Add more pages (About, Contact)
- Set up a custom domain in Cloudflare
- Configure comments moderation

---

Need help? [Open an issue](https://github.com/dylanburkey/astro-blog-cms/issues)
