import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { S3StorageAdapter } from '../src/modules/inspections/infrastructure/s3-storage.adapter';
import { loadConfig } from '../src/shared/config/config.schema';
import { ConfigService } from '../src/shared/config/config.service';
import { TEST_ENV } from './support/test-env';

const storage = new S3StorageAdapter(new ConfigService(loadConfig(TEST_ENV)));

describe('S3StorageAdapter (LocalStack)', () => {
  it('signs PUT with type and length, reads metadata and content, then removes the object', async () => {
    const key = `test/${randomUUID()}.jpg`;
    const bytes = Buffer.from('small jpeg payload');
    const upload = await storage.createUploadUrl({
      key,
      contentType: 'image/jpeg',
      size: bytes.length,
    });
    const signed = new URL(upload.url);
    expect(signed.host).toBe('localhost:4566');
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
    expect(new Date(upload.expiresAt).getTime() - Date.now()).toBeGreaterThan(290_000);
    expect(new Date(upload.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(300_000);
    expect(await storage.head(key)).toBeNull();

    try {
      const written = await fetch(upload.url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.length) },
        body: bytes,
      });
      expect(written.status).toBe(200);
      expect(await storage.head(key)).toEqual({ contentType: 'image/jpeg', size: bytes.length });
      const readUrl = await storage.createReadUrl(key);
      expect(new URL(readUrl).host).toBe('localhost:4566');
      const read = await fetch(readUrl);
      expect(read.status).toBe(200);
      expect(Buffer.from(await read.arrayBuffer())).toEqual(bytes);
    } finally {
      await storage.remove(key);
    }
    expect(await storage.head(key)).toBeNull();
  });
});
