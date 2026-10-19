import { createElement } from 'react';
import { docs } from '@/.source';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { createFromSource } from 'fumadocs-core/search/server';
import { loader } from 'fumadocs-core/source';

import { source as originalSource } from '@/core/docs/source';
import { configuredIcons } from '@/shared/blocks/common/icon-registry';

// Create a modified i18n config that maps 'zh' to 'en' for Orama
const searchI18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: ['en'], // Only use 'en' for search to avoid Orama language errors
};

// Create a separate source instance for search with only English language
const searchSource = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n: searchI18n,
  icon(icon) {
    if (!icon) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(configuredIcons, icon)) {
      return createElement(configuredIcons[icon]);
    }
  },
});

export const { GET } = createFromSource(searchSource, {
  language: 'english',
});
