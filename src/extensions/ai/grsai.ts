import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

export interface GrsaiConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
}

function videoAspectRatio(value?: string) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (
    normalized === 'portrait' ||
    normalized === 'landscape' ||
    normalized === 'square'
  ) {
    return normalized;
  }
  if (normalized === '1:1' || normalized === '1x1') return 'square';
  if (normalized === '16:9' || normalized === '16x9') return 'landscape';
  if (normalized === '9:16' || normalized === '9x16') return 'portrait';
  const match = normalized.match(/^(\d+)[:x](\d+)$/);
  if (match) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width === height) return 'square';
    return width > height ? 'landscape' : 'portrait';
  }
  return 'square';
}

type GrsaiResultItem = { url?: string };
type GrsaiResponse = {
  id?: string;
  status?: string;
  data?: GrsaiResultItem[];
  results?: GrsaiResultItem[];
  error?: string | { message?: string };
  created?: number;
};

export class GrsaiProvider implements AIProvider {
  readonly name = 'grsai';
  configs: GrsaiConfigs;
  private baseUrl: string;

  constructor(configs: GrsaiConfigs) {
    this.configs = configs;
    this.baseUrl = (configs.baseUrl || 'https://grsaiapi.com').replace(
      /\/+$/,
      ''
    );
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };
  }

  private errorMessage(response: GrsaiResponse, fallback: string) {
    if (typeof response.error === 'string') return response.error;
    return response.error?.message || fallback;
  }

  private logFailure(
    stage: 'generate' | 'query',
    details: Record<string, unknown>
  ) {
    console.error(
      JSON.stringify({
        event: 'grsai_provider_failed',
        stage,
        ...details,
      })
    );
  }

  private mapStatus(status?: string) {
    switch (status) {
      case 'running':
        return AITaskStatus.PROCESSING;
      case 'succeeded':
        return AITaskStatus.SUCCESS;
      case 'violation':
      case 'failed':
        return AITaskStatus.FAILED;
      default:
        return AITaskStatus.PENDING;
    }
  }

  private async storeImages(images: AIImage[], customStorage = true) {
    if (!customStorage || !this.configs.customStorage || images.length === 0)
      return images;
    const files: AIFile[] = images.flatMap((image, index) =>
      image.imageUrl
        ? [
            {
              url: image.imageUrl,
              contentType: 'image/png',
              key: `grsai/image/${getUuid()}.png`,
              index,
              type: 'image',
            },
          ]
        : []
    );
    const stored = await saveFiles(files);
    stored?.forEach((file) => {
      if (file.index !== undefined && images[file.index]) {
        images[file.index].imageUrl = file.url;
      }
    });
    return images;
  }

  private async storeVideos(videos: AIVideo[], customStorage = true) {
    if (!customStorage || !this.configs.customStorage || videos.length === 0)
      return videos;
    const files: AIFile[] = videos.flatMap((video, index) =>
      video.videoUrl
        ? [
            {
              url: video.videoUrl,
              contentType: 'video/mp4',
              key: `grsai/video/${getUuid()}.mp4`,
              index,
              type: 'video',
            },
          ]
        : []
    );
    const stored = await saveFiles(files);
    stored?.forEach((file) => {
      if (file.index !== undefined && videos[file.index]) {
        videos[file.index].videoUrl = file.url;
      }
    });
    return videos;
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType === AIMediaType.TEXT) {
      return this.generateText(params);
    }
    if (![AIMediaType.IMAGE, AIMediaType.VIDEO].includes(params.mediaType)) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }
    if (!params.model) throw new Error('model is required');
    if (!params.prompt) throw new Error('prompt is required');

    const options = params.options || {};
    const payload: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      replyType: 'async',
    };
    const images = Array.isArray(options.images)
      ? options.images
      : Array.isArray(options.image_input)
        ? options.image_input
        : Array.isArray(options.image)
          ? options.image
          : [];
    if (images.length) payload.images = images;
    const aspectRatio = options.aspectRatio || options.size;
    if (params.mediaType === AIMediaType.VIDEO) {
      payload.aspectRatio = videoAspectRatio(
        typeof aspectRatio === 'string' ? aspectRatio : undefined
      );
    } else if (aspectRatio) {
      payload.aspectRatio = aspectRatio;
    }
    if (params.mediaType === AIMediaType.IMAGE) {
      if (options.quality) payload.quality = options.quality;
      payload.background = options.background || 'transparent';
    } else {
      payload.resolution = options.resolution || '768p';
      payload.duration = options.duration || 2;
    }

    const response = await fetch(`${this.baseUrl}/v1/api/generate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as GrsaiResponse;
    if (!response.ok) {
      const reason = this.errorMessage(
        result,
        `request failed with status: ${response.status}`
      );
      this.logFailure('generate', {
        mediaType: params.mediaType,
        model: params.model,
        status: result.status,
        httpStatus: response.status,
        reason,
      });
      throw new Error(reason);
    }

    const urls = result.results || result.data || [];
    const imagesOut =
      params.mediaType === AIMediaType.IMAGE
        ? await this.storeImages(
            urls.flatMap((item) =>
              item.url
                ? [
                    {
                      imageUrl: item.url,
                      createTime: result.created
                        ? new Date(result.created * 1000)
                        : new Date(),
                    },
                  ]
                : []
            ),
            options.customStorage !== false
          )
        : [];
    const videosOut =
      params.mediaType === AIMediaType.VIDEO
        ? await this.storeVideos(
            urls.flatMap((item) =>
              item.url
                ? [
                    {
                      videoUrl: item.url,
                      createTime: result.created
                        ? new Date(result.created * 1000)
                        : new Date(),
                    },
                  ]
                : []
            ),
            options.customStorage !== false
          )
        : [];
    const taskId = result.id;
    if (!taskId) {
      const reason = this.errorMessage(result, 'generate failed: no task id');
      this.logFailure('generate', {
        mediaType: params.mediaType,
        model: params.model,
        status: result.status,
        reason,
      });
      throw new Error(reason);
    }
    const taskStatus =
      imagesOut.length || videosOut.length
        ? AITaskStatus.SUCCESS
        : this.mapStatus(result.status || 'running');
    if (taskStatus === AITaskStatus.FAILED) {
      this.logFailure('generate', {
        mediaType: params.mediaType,
        model: params.model,
        taskId,
        status: result.status,
        reason: this.errorMessage(result, 'PROVIDER_GENERATE_FAILED'),
      });
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images: imagesOut.length ? imagesOut : undefined,
        videos: videosOut.length ? videosOut : undefined,
        status: result.status || 'running',
        errorMessage: this.errorMessage(result, ''),
        createTime: result.created
          ? new Date(result.created * 1000)
          : new Date(),
      },
      taskResult: result,
    };
  }

  private async generateText(params: AIGenerateParams): Promise<AITaskResult> {
    if (!params.model) throw new Error('model is required');
    if (!params.prompt) throw new Error('prompt is required');
    const options = params.options || {};
    const images = Array.isArray(options.images)
      ? options.images
      : Array.isArray(options.image_input)
        ? options.image_input
        : [];
    const content = images.length
      ? [
          { type: 'text', text: params.prompt },
          ...images.map((url: string) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ]
      : params.prompt;
    const payload: Record<string, unknown> = {
      model: params.model,
      messages: [{ role: 'user', content }],
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxOutputTokens ?? 2048,
    };
    if (options.reasoningEffort) {
      payload.reasoning_effort = options.reasoningEffort;
    }
    if (options.responseMimeType === 'application/json') {
      payload.response_format = { type: 'json_object' };
    }

    console.info(
      JSON.stringify({
        event: 'grsai_text_request',
        model: params.model,
        promptCharacters: params.prompt.length,
        referenceImageCount: images.length
      })
    );
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as {
      id?: string;
      choices?: Array<{ message?: { content?: string } }>;
      error?: string | { message?: string };
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    if (!response.ok) {
      const reason = this.errorMessage(
        result,
        `request failed with status: ${response.status}`
      );
      this.logFailure('generate', {
        mediaType: AIMediaType.TEXT,
        model: params.model,
        httpStatus: response.status,
        reason,
      });
      throw new Error(reason);
    }

    console.info(
      JSON.stringify({
        event: 'grsai_text_response',
        id: result.id,
        usage: result.usage || null,
      })
    );
    const text = String(result.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      const reason = 'empty text response';
      this.logFailure('generate', {
        mediaType: AIMediaType.TEXT,
        model: params.model,
        reason,
      });
      throw new Error(reason);
    }
    return {
      taskId: result.id || getUuid(),
      taskStatus: AITaskStatus.SUCCESS,
      taskInfo: {
        status: 'succeeded',
      },
      taskResult: { ...result, text },
    };
  }

  async query({
    taskId,
    mediaType,
    model,
    options,
  }: {
    taskId: string;
    mediaType?: string;
    model?: string;
    options?: Record<string, unknown>;
  }): Promise<AITaskResult> {
    if (
      ![AIMediaType.IMAGE, AIMediaType.VIDEO].includes(mediaType as AIMediaType)
    ) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }
    const response = await fetch(
      `${this.baseUrl}/v1/api/result?id=${encodeURIComponent(taskId)}`,
      { method: 'GET', headers: this.headers() }
    );
    const result = (await response.json()) as GrsaiResponse;
    if (!response.ok && !result.status) {
      const reason = this.errorMessage(
        result,
        `request failed with status: ${response.status}`
      );
      this.logFailure('query', {
        mediaType,
        model,
        taskId,
        httpStatus: response.status,
        reason,
      });
      throw new Error(reason);
    }

    const taskStatus = this.mapStatus(result.status);
    if (taskStatus === AITaskStatus.FAILED) {
      this.logFailure('query', {
        mediaType,
        model,
        taskId: result.id || taskId,
        status: result.status,
        reason: this.errorMessage(result, 'PROVIDER_QUERY_FAILED'),
      });
    }
    const urls = result.results || [];
    const images =
      mediaType === AIMediaType.IMAGE
        ? await this.storeImages(
            urls.flatMap((item) => (item.url ? [{ imageUrl: item.url }] : [])),
            options?.customStorage !== false
          )
        : undefined;
    const videos =
      mediaType === AIMediaType.VIDEO
        ? await this.storeVideos(
            urls.flatMap((item) => (item.url ? [{ videoUrl: item.url }] : [])),
            options?.customStorage !== false
          )
        : undefined;

    return {
      taskId: result.id || taskId,
      taskStatus,
      taskInfo: {
        images,
        videos,
        status: result.status,
        errorMessage: this.errorMessage(result, ''),
      },
      taskResult: result,
    };
  }
}
