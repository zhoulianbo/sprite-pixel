import {
  Environment,
  ScanAction,
  ScanSemanticMode,
  WaffoPancake,
  type ScanResult,
} from '@waffo/pancake-ts';

import { normalizeWaffoPrivateKey } from '@/extensions/payment/waffo';

import type {
  PromptScanAction,
  PromptScanResult,
  PromptScanner,
  ScanPromptInput,
} from './types';

export type WaffoPromptScannerConfigs = {
  merchantId: string;
  privateKey: string;
  environment?: 'test' | 'prod';
  fetch?: typeof fetch;
  /** Default `enforce` so semantic scoring affects the verdict. */
  semantic?: ScanSemanticMode;
};

/**
 * Waffo Content Safety — POST /v1/actions/verification/scan-prompt
 * @docs https://docs.waffo.ai/api-reference/endpoints/content-safety/scan-prompt
 */
export class WaffoPromptScanner implements PromptScanner {
  readonly name = 'waffo';
  private configs: WaffoPromptScannerConfigs;

  constructor(configs: WaffoPromptScannerConfigs) {
    this.configs = configs;
  }

  private getClient() {
    if (!this.configs.merchantId || !this.configs.privateKey) {
      throw new Error('Waffo merchant ID or private key is not configured');
    }

    return new WaffoPancake({
      merchantId: this.configs.merchantId,
      privateKey: normalizeWaffoPrivateKey(this.configs.privateKey),
      environment:
        this.configs.environment === 'prod'
          ? Environment.Prod
          : Environment.Test,
      fetch: this.configs.fetch,
    });
  }

  async scanPrompt(input: ScanPromptInput): Promise<PromptScanResult> {
    const prompt = input.prompt.trim();
    if (!prompt) {
      throw new Error('Prompt cannot be empty or contain only whitespace');
    }

    const verdict: ScanResult = await this.getClient().contentSafety.scanPrompt(
      {
        prompt,
        locale: input.locale,
        semantic: this.configs.semantic ?? ScanSemanticMode.Enforce,
      }
    );

    return {
      action: mapScanAction(verdict.action),
      reasonCode: String(verdict.reasonCode),
      matchedCategories: (verdict.matchedCategories || []).map(String),
      requestId: verdict.requestId,
      provider: this.name,
    };
  }
}

function mapScanAction(action: ScanAction | string): PromptScanAction {
  if (action === ScanAction.Allow || action === 'allow') return 'allow';
  if (action === ScanAction.Block || action === 'block') return 'block';
  return 'review';
}
