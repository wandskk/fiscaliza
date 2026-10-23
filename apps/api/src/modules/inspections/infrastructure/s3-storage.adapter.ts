import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../../shared/config/config.service';
import type {
  Storage,
  StoredObject,
  UploadUrl,
  UploadUrlRequest,
} from '../application/ports/storage.port';

const URL_LIFETIME_SECONDS = 300;
// Without this the SDK signs a CRC32 of the empty body into the upload URL, and the
// browser's real file then fails the check
const CHECKSUMS = { requestChecksumCalculation: 'WHEN_REQUIRED' } as const;

@Injectable()
export class S3StorageAdapter implements Storage {
  private readonly server: S3Client;
  private readonly signer: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const region = config.get('AWS_REGION');
    const endpoint = config.get('AWS_ENDPOINT');
    const publicEndpoint = config.get('AWS_PUBLIC_ENDPOINT') ?? endpoint;
    // LocalStack accepts any key; on AWS the default chain (role or profile) is used
    const credentials = endpoint ? { accessKeyId: 'test', secretAccessKey: 'test' } : undefined;
    this.server = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials,
      ...CHECKSUMS,
    });
    this.signer =
      publicEndpoint === endpoint
        ? this.server
        : new S3Client({
            region,
            endpoint: publicEndpoint,
            forcePathStyle: Boolean(publicEndpoint),
            credentials,
            ...CHECKSUMS,
          });
    this.bucket = config.get('PHOTOS_BUCKET');
  }

  async createUploadUrl({ key, contentType, size }: UploadUrlRequest): Promise<UploadUrl> {
    const url = await getSignedUrl(
      this.signer,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      }),
      // Signed, so the browser cannot send another type than the one RN-05 accepted
      { expiresIn: URL_LIFETIME_SECONDS, signableHeaders: new Set(['content-type']) },
    );
    return { url, expiresAt: new Date(Date.now() + URL_LIFETIME_SECONDS * 1000).toISOString() };
  }

  createReadUrl(key: string): Promise<string> {
    return getSignedUrl(this.signer, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: URL_LIFETIME_SECONDS,
    });
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.server.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (result.ContentType === undefined || result.ContentLength === undefined) return null;
      return { contentType: result.ContentType, size: result.ContentLength };
    } catch (error) {
      if (error instanceof Error && (error.name === 'NotFound' || error.name === 'NoSuchKey'))
        return null;
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await this.server.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
