import { getRequestConfig } from 'next-intl/server';

import {
  defaultLocale,
  localeMessagesPaths,
  localeMessagesRootPath,
} from '@/config/locale';

import { routing } from './config';

type MessageValue = Record<string, unknown>;

function mergeMessages(fallback: unknown, localized: unknown): unknown {
  if (Array.isArray(fallback) && Array.isArray(localized)) {
    const length = Math.max(fallback.length, localized.length);
    return Array.from({ length }, (_, index) =>
      mergeMessages(fallback[index], localized[index])
    );
  }

  if (
    !fallback ||
    !localized ||
    typeof fallback !== 'object' ||
    typeof localized !== 'object' ||
    Array.isArray(fallback) ||
    Array.isArray(localized)
  ) {
    return localized ?? fallback;
  }

  const result: MessageValue = { ...(fallback as MessageValue) };
  Object.entries(localized as MessageValue).forEach(([key, value]) => {
    result[key] = mergeMessages(result[key], value);
  });
  return result;
}

export async function loadMessages(
  path: string,
  locale: string = defaultLocale
) {
  const fallbackMessages = await import(
    `@/config/locale/messages/${defaultLocale}/${path}.json`
  )
    .then((messages) => messages.default)
    .catch(() => ({}));

  if (locale === defaultLocale) {
    return fallbackMessages;
  }

  try {
    const messages = await import(
      `@/config/locale/messages/${locale}/${path}.json`
    );
    return mergeMessages(fallbackMessages, messages.default);
  } catch {
    return fallbackMessages;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as string)) {
    locale = routing.defaultLocale;
  }

  if (['zh-CN'].includes(locale)) {
    locale = 'zh';
  }

  try {
    // load all local messages
    const allMessages = await Promise.all(
      localeMessagesPaths.map((path) => loadMessages(path, locale))
    );

    // merge all local messages
    const messages: any = {};

    localeMessagesPaths.forEach((path, index) => {
      const localMessages = allMessages[index];

      const keys = path.split('/');
      let current = messages;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = localMessages;
    });

    return {
      locale,
      messages,
    };
  } catch (e) {
    return {
      locale: defaultLocale,
      messages: await loadMessages(localeMessagesRootPath, defaultLocale),
    };
  }
});
