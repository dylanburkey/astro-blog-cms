/**
 * CMS Configuration
 * 
 * Override these values in your project by creating a cms.config.ts file
 * or by passing props directly to components.
 */

export interface CMSTheme {
  /** Background color or gradient (e.g., '#0a0a0a' or 'linear-gradient(...)') */
  background?: string;
  /** Surface color for cards, sidebar, modals */
  surface?: string;
  /** Primary accent color for buttons, links */
  primary?: string;
  /** Main text color */
  text?: string;
  /** Muted/secondary text color */
  textMuted?: string;
  /** Border color */
  border?: string;
}

export interface CMSConfig {
  /** Site/brand name shown in admin */
  siteName: string;
  /** Path to logo image (relative to public/) */
  logoPath?: string;
  /** Base path for admin routes (default: /admin) */
  adminBasePath: string;
  /** Session cookie name */
  sessionCookieName: string;
  /** Session storage key prefix */
  storageKeyPrefix: string;
  /** Theme/color configuration */
  theme?: CMSTheme;
}

/** Default dark theme */
export const defaultTheme: CMSTheme = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  primary: '#6366f1',
  text: '#ffffff',
  textMuted: '#999999',
  border: '#333333',
};

/** Light theme preset */
export const lightTheme: CMSTheme = {
  background: '#f5f5f5',
  surface: '#ffffff',
  primary: '#6366f1',
  text: '#1a1a1a',
  textMuted: '#666666',
  border: '#e0e0e0',
};

/** Blue theme preset */
export const blueTheme: CMSTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  primary: '#3b82f6',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#334155',
};

/** Green theme preset */
export const greenTheme: CMSTheme = {
  background: '#022c22',
  surface: '#064e3b',
  primary: '#10b981',
  text: '#ecfdf5',
  textMuted: '#6ee7b7',
  border: '#065f46',
};

export const defaultConfig: CMSConfig = {
  siteName: 'CMS',
  logoPath: undefined, // No logo by default, shows text only
  adminBasePath: '/admin',
  sessionCookieName: 'cms_admin_session',
  storageKeyPrefix: 'cms',
  theme: defaultTheme,
};

// Allow runtime config override
let currentConfig: CMSConfig = { ...defaultConfig };

export function configureCMS(config: Partial<CMSConfig>): void {
  currentConfig = { ...defaultConfig, ...config };
}

export function getConfig(): CMSConfig {
  return currentConfig;
}

// Navigation items for admin sidebar
export function getNavItems(basePath: string = '/admin') {
  return [
    { href: basePath, label: 'Dashboard', icon: 'dashboard' },
    { href: `${basePath}/blog`, label: 'Blog', icon: 'blog' },
    { href: `${basePath}/media`, label: 'Media', icon: 'media' },
    { href: `${basePath}/settings`, label: 'Settings', icon: 'settings' },
  ];
}
