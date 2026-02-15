// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'http://localhost:4321', // Update to your production URL
  output: 'server',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => {
        // Exclude admin pages from sitemap
        return !page.includes('/admin/');
      },
      serialize(item) {
        if (item.url.includes('/blog/')) {
          item.priority = 0.9;
        }
        return item;
      },
    }),
  ],
  adapter: cloudflare({
    imageService: 'compile',
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.workers.dev',
      },
      {
        protocol: 'https', 
        hostname: 'images.unsplash.com',
      },
    ],
  },
  vite: {
    build: {
      minify: true,
    },
  },
});
