/**
 * Astro Blog CMS
 * 
 * A complete blog CMS with WYSIWYG editor for Astro + Cloudflare
 * 
 * @author Dylan Burkey
 * @license MIT
 */

// Configuration
export { 
  defaultConfig, 
  configureCMS, 
  getConfig, 
  getNavItems,
  // Theme presets
  defaultTheme,
  lightTheme,
  blueTheme,
  greenTheme,
} from './config';
export type { CMSConfig, CMSTheme } from './config';

// Utils
export * from './utils/blog';

// Types
export type { BlogPost, BlogCategory, BlogTag, BlogAuthor } from './utils/blog';

// Auth (for custom implementations)
export { isAuthenticated, hashPassword, verifyPassword, generateToken } from './lib/auth';

// Re-export paths for easy reference
export const paths = {
  // Admin pages
  admin: {
    dashboard: '/admin',
    blog: {
      list: '/admin/blog',
      new: '/admin/blog/new',
      edit: (id: number | string) => `/admin/blog/edit/${id}`,
      categories: '/admin/blog/categories',
      tags: '/admin/blog/tags',
    },
    media: '/admin/media',
    settings: '/admin/settings',
    login: '/admin/login',
    logout: '/admin/logout',
  },
  // API endpoints
  api: {
    auth: {
      login: '/admin/api/auth/login.json',
      logout: '/admin/api/auth/logout.json',
    },
    blog: {
      create: '/admin/api/blog/create.json',
      update: '/admin/api/blog/update.json',
      delete: (id: number | string) => `/admin/api/blog/delete/${id}.json`,
      duplicate: (id: number | string) => `/admin/api/blog/duplicate/${id}.json`,
    },
    images: {
      upload: '/admin/api/upload-image.json',
      list: '/admin/api/list-images.json',
      delete: '/admin/api/delete-image.json',
    },
  },
  // Public pages
  public: {
    blog: {
      list: '/blog',
      post: (slug: string) => `/blog/${slug}`,
      category: (slug: string) => `/blog/category/${slug}`,
      tag: (slug: string) => `/blog/tag/${slug}`,
    },
  },
};
