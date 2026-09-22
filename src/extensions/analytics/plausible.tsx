import { ReactNode } from 'react';
import Script from 'next/script';

import { AnalyticsConfigs, AnalyticsProvider } from '.';

import { buildPlausibleBootstrapScript } from './plausible-utils';

/**
 * Plausible analytics configs
 * @docs https://plausible.io/docs/integration-guides
 */
export interface PlausibleAnalyticsConfigs extends AnalyticsConfigs {
  domain: string; // tracked site hostname in Plausible dashboard
  src: string; // hashed loader script URL (pa-*.js)
}

/**
 * Plausible provider
 * @website https://plausible.io/
 */
export class PlausibleAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'plausible';

  configs: PlausibleAnalyticsConfigs;

  constructor(configs: PlausibleAnalyticsConfigs) {
    this.configs = configs;
  }

  getHeadScripts(): ReactNode {
    const src = this.configs.src.trim();
    if (!src) {
      return null;
    }

    return (
      <>
        <Script
          id={`${this.name}-loader`}
          src={src}
          strategy="afterInteractive"
          async
        />
        <Script
          id={`${this.name}-init`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: buildPlausibleBootstrapScript(src),
          }}
        />
      </>
    );
  }
}
