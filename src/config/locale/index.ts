import { envConfigs } from '..';

export const localeNames: Record<string, string> = {
  en: 'English',
  zh: '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
};

export const localeFlags: Record<string, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  'zh-Hant': '🇭🇰',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

export const locales = ['en', 'zh', 'zh-Hant', 'ja', 'ko'];

export const defaultLocale = envConfigs.locale;

export const localePrefix = 'as-needed';

export const localeDetection = false;

export const localeMessagesRootPath = '@/config/locale/messages';

export const localeMessagesPaths = [
  'common',
  'landing',
  'showcases',
  'blog',
  'updates',
  'pricing',
  'dashboard',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'settings/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/categories',
  'admin/posts',
  'admin/footer-links',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/apikeys',
  'admin/ai-tasks',
  'admin/chats',
  'ai/chat',
  'activity/sidebar',
  'activity/chats',
  'tools/sprites',
  'pages/index',
  'pages/pricing',
  'pages/showcases',
  'pages/blog',
  'pages/updates',
  'pages/gallery',
  'generation',
  'workspace',
];
