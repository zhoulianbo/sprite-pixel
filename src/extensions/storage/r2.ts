import { isRootStorageKey } from '@/shared/lib/storage-paths';

import type {
  StorageConfigs,
  StorageDownloadResult,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageSignedUploadOptions,
  StorageSignedUploadResult,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath?: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  private getUploadPath() {
    let uploadPath = this.configs.uploadPath || 'uploads';
    if (uploadPath.startsWith('/')) {
      uploadPath = uploadPath.slice(1);
    }
    if (uploadPath.endsWith('/')) {
      uploadPath = uploadPath.slice(0, -1);
    }
    return uploadPath;
  }

  private getEndpoint() {
    return (
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`
    );
  }

  private resolveObjectKey(key: string) {
    if (isRootStorageKey(key)) return key;
    const uploadPath = this.getUploadPath();
    return uploadPath ? `${uploadPath}/${key}` : key;
  }

  private objectUrl(key: string, bucket?: string) {
    const uploadBucket = bucket || this.configs.bucket;
    return `${this.getEndpoint()}/${uploadBucket}/${this.resolveObjectKey(key)}`;
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const objectKey = this.resolveObjectKey(options.key);
    return this.configs.publicDomain
      ? `${this.configs.publicDomain}/${objectKey}`
      : this.objectUrl(options.key, options.bucket);
  };

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;
      const url = this.objectUrl(options.key, uploadBucket);

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const response = await client.fetch(
        new Request(url, {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  downloadFile = async (options: {
    key: string;
    bucket?: string;
  }): Promise<StorageDownloadResult> => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      const url = this.objectUrl(options.key, uploadBucket);
      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });
      const response = await client.fetch(new Request(url));
      if (!response.ok) {
        return { success: false, error: `Download failed: ${response.status}` };
      }
      return {
        success: true,
        body: response.body,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: response.headers.get('content-length') || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const url = this.objectUrl(options.key, uploadBucket);

      const { AwsClient } = await import('aws4fetch');

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        uploadPath: this.getUploadPath(),
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async createSignedUploadUrl(
    options: StorageSignedUploadOptions
  ): Promise<StorageSignedUploadResult> {
    const uploadBucket = options.bucket || this.configs.bucket;
    if (!uploadBucket) {
      throw new Error('Bucket is required');
    }
    const expiresIn = Math.max(60, Math.min(options.expiresIn ?? 900, 3600));
    const url = new URL(this.objectUrl(options.key, uploadBucket));
    url.searchParams.set('X-Amz-Expires', String(expiresIn));
    const { AwsClient } = await import('aws4fetch');
    const client = new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region || 'auto',
    });
    const signed = await client.sign(
      new Request(url, {
        method: 'PUT',
        headers: {
          'Content-Type': options.contentType,
        },
      }),
      { aws: { signQuery: true } }
    );
    return {
      uploadUrl: signed.url,
      headers: { 'Content-Type': options.contentType },
    };
  }

  async createSignedDownloadUrl(options: {
    key: string;
    expiresIn?: number;
    bucket?: string;
  }) {
    const downloadBucket = options.bucket || this.configs.bucket;
    if (!downloadBucket) {
      throw new Error('Bucket is required');
    }
    const expiresIn = Math.max(60, Math.min(options.expiresIn ?? 900, 3600));
    const url = new URL(this.objectUrl(options.key, downloadBucket));
    url.searchParams.set('X-Amz-Expires', String(expiresIn));
    const { AwsClient } = await import('aws4fetch');
    const client = new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region || 'auto',
    });
    const signed = await client.sign(new Request(url, { method: 'GET' }), {
      aws: { signQuery: true },
    });
    return signed.url;
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
