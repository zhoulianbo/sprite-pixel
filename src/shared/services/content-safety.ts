import {
  ContentSafetyError,
  WaffoPromptScanner,
  type PromptScanLocale,
  type PromptScanResult,
  type PromptScanner,
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

  const scanner = options?.scanner ?? (await getPromptScanner());
  const input: ScanPromptInput = {
    prompt: trimmed,
    locale: toPromptScanLocale(options?.locale),
  };

  try {
    return await scanner.scanPrompt(input);
  } catch (error) {
    if (error instanceof ContentSafetyError) throw error;
    throw new ContentSafetyError('CONTENT_SAFETY_FAILED', 503);
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

  if (result.action === 'allow') {
    return result;
  }

  if (result.action === 'block') {
    throw new ContentSafetyError('PROMPT_BLOCKED', 400, result);
  }

  // `review` (including service_degraded) — do not generate.
  throw new ContentSafetyError('PROMPT_REVIEW_REQUIRED', 503, result);
}
