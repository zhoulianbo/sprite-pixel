/**
 * Provider-agnostic prompt content-safety types.
 * Swap scanners without changing generation call sites.
 */

export type PromptScanLocale = 'ja' | 'en' | 'zh';

export type PromptScanAction = 'allow' | 'review' | 'block';

export type PromptScanResult = {
  /** Continue to generation only when `allow`. */
  action: PromptScanAction;
  reasonCode: string;
  matchedCategories: string[];
  requestId?: string;
  /** Scanner provider name, e.g. `waffo`. */
  provider: string;
};

export type ScanPromptInput = {
  prompt: string;
  locale?: PromptScanLocale;
};

/**
 * Pluggable prompt scanner. Replace the Waffo implementation with another
 * provider by registering a different `PromptScanner` in the content-safety service.
 */
export interface PromptScanner {
  readonly name: string;
  scanPrompt(input: ScanPromptInput): Promise<PromptScanResult>;
}

export class ContentSafetyError extends Error {
  constructor(
    public code:
      | 'PROMPT_BLOCKED'
      | 'PROMPT_REVIEW_REQUIRED'
      | 'CONTENT_SAFETY_NOT_CONFIGURED'
      | 'CONTENT_SAFETY_FAILED',
    public status = 400,
    public result?: PromptScanResult
  ) {
    super(code);
    this.name = 'ContentSafetyError';
  }
}
