import {
  ContentSafetyError,
  WaffoPromptScanner,
  type PromptScanLocale,
  type PromptScanner,
  type PromptScanResult,
  type ScanPromptInput,
} from '@/extensions/content-safety';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * Resolve the active prompt scanner from configs.
 * Swap providers here when adding another content-safety backend.
 */
export function getPromptScannerWithConfigs(configs: Configs): PromptScanner {
  const merchantId = configs.waffo_merchant_id?.trim();
  const privateKey = configs.waffo_private_key?.trim();

  if (!merchantId || !privateKey) {
    throw new ContentSafetyError('CONTENT_SAFETY_NOT_CONFIGURED', 503);
  }

  return new WaffoPromptScanner({
    merchantId,
    privateKey,
    environment: configs.waffo_environment === 'prod' ? 'prod' : 'test',
  });
}

export async function getPromptScanner(): Promise<PromptScanner> {
  const configs = await getAllConfigs();
  return getPromptScannerWithConfigs(configs);
}

/**
 * Map app locales to Waffo scan-prompt locales (`ja` | `en` | `zh`).
 */
export function toPromptScanLocale(
  locale?: string | null
): PromptScanLocale | undefined {
  if (!locale) return undefined;
  const normalized = locale.trim().toLowerCase();
  if (normalized === 'ja') return 'ja';
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  if (normalized === 'en') return 'en';
  return 'en';
}

/**
 * Call the configured provider's prompt scan API
 * (`POST /v1/actions/verification/scan-prompt` for Waffo).
 */
export async function scanGenerationPrompt(
  prompt: string,
  options?: { locale?: string; scanner?: PromptScanner }
): Promise<PromptScanResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new ContentSafetyError('CONTENT_SAFETY_FAILED', 400);
  }

  const input: ScanPromptInput = {
    prompt: trimmed,
    locale: toPromptScanLocale(options?.locale),
  };
  let scanner = options?.scanner;

  try {
    scanner ??= await getPromptScanner();
    return await scanner.scanPrompt(input);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'content_safety_scan_failed',
        provider: scanner?.name || 'waffo',
        code:
          error instanceof ContentSafetyError
            ? error.code
            : 'CONTENT_SAFETY_FAILED',
        reason:
          error instanceof Error
            ? error.message.replace(/\s+/g, ' ').trim().slice(0, 1000)
            : String(error).slice(0, 1000),
      })
    );
    // Fail open when Waffo is unavailable. The generation gate below only
    // rejects an explicit `block` verdict.
    return {
      action: 'review',
      reasonCode: 'service_degraded',
      matchedCategories: [],
      provider: scanner?.name || 'waffo',
    };
  }
}

/**
 * Gate generation on user-authored prompt text only.
 * Empty prompts are skipped (e.g. reference-only flows without text).
 * Do not call this on Gemini-expanded or template-assembled prompts.
 */
export async function assertPromptAllowedForGeneration(
  prompt: string | null | undefined,
  options?: { locale?: string; scanner?: PromptScanner }
): Promise<PromptScanResult | null> {
  const trimmed = prompt?.trim();
  if (!trimmed) return null;

  const result = await scanGenerationPrompt(trimmed, options);

  if (result.action === 'block') {
    console.error(
      JSON.stringify({
        event: 'content_safety_prompt_blocked',
        provider: result.provider,
        action: result.action,
        reasonCode: result.reasonCode,
        matchedCategories: result.matchedCategories,
        requestId: result.requestId || null,
      })
    );
    throw new ContentSafetyError('PROMPT_BLOCKED', 400, result);
  }

  if (result.action === 'review') {
    console.warn(
      JSON.stringify({
        event: 'content_safety_prompt_review_bypassed',
        provider: result.provider,
        action: result.action,
        reasonCode: result.reasonCode,
        matchedCategories: result.matchedCategories,
        requestId: result.requestId || null,
      })
    );
  }

  return result;
}
