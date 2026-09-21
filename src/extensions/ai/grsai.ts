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

  private async storeImages(images: AIImage[]) {
    if (!this.configs.customStorage || images.length === 0) return images;
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

  private async storeVideos(videos: AIVideo[]) {
    if (!this.configs.customStorage || videos.length === 0) return videos;
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
    if (params.mediaType !== AIMediaType.IMAGE) {
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
    if (aspectRatio) payload.aspectRatio = aspectRatio;
    if (options.quality) payload.quality = options.quality;
    payload.background = options.background || 'transparent';

    const response = await fetch(`${this.baseUrl}/v1/api/generate`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as GrsaiResponse;
    if (!response.ok) {
      throw new Error(
        this.errorMessage(
          result,
          `request failed with status: ${response.status}`
        )
      );
    }

    const urls = result.results || result.data || [];
    const imagesOut = await this.storeImages(
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
      )
    );
    const taskId = result.id;
    if (!taskId) {
      throw new Error(this.errorMessage(result, 'generate failed: no task id'));
    }
    const taskStatus = imagesOut.length
      ? AITaskStatus.SUCCESS
      : this.mapStatus(result.status || 'running');

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images: imagesOut.length ? imagesOut : undefined,
        status: result.status || 'running',
        errorMessage: this.errorMessage(result, ''),
        createTime: result.created
          ? new Date(result.created * 1000)
          : new Date(),
      },
      taskResult: result,
    };
  }

  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: string;
    model?: string;
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
      throw new Error(
        this.errorMessage(
          result,
          `request failed with status: ${response.status}`
        )
      );
    }

    const taskStatus = this.mapStatus(result.status);
    const urls = result.results || [];
    const images =
      mediaType === AIMediaType.IMAGE
        ? await this.storeImages(
            urls.flatMap((item) => (item.url ? [{ imageUrl: item.url }] : []))
          )
        : undefined;
    const videos =
      mediaType === AIMediaType.VIDEO
        ? await this.storeVideos(
            urls.flatMap((item) => (item.url ? [{ videoUrl: item.url }] : []))
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
