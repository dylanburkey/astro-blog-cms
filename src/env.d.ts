/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

import type { AdvancedRuntime } from '@astrojs/cloudflare';

declare namespace App {
  interface Locals extends AdvancedRuntime {
    // Add any custom properties here
  }
}

// Define the Cloudflare environment bindings
interface CloudflareEnv {
  DB: D1Database;
  ADMIN_SECRET_KEY?: string;
  TOKEN_STATS_API_URL?: string;
  API_ENDPOINT?: string;
  CACHE?: KVNamespace;
}

// Make the types available globally
declare global {
  namespace App {
    interface Platform {
      env: CloudflareEnv;
    }
  }
}