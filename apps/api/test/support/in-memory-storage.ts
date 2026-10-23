import type {
  Storage,
  StoredObject,
  UploadUrl,
  UploadUrlRequest,
} from '../../src/modules/inspections/application/ports/storage.port';

// Stands in for S3: a test "uploads" with put() what the browser would PUT to the signed URL
export class InMemoryStorage implements Storage {
  readonly objects = new Map<string, StoredObject>();
  readonly signed: UploadUrlRequest[] = [];

  put(key: string, object: StoredObject): void {
    this.objects.set(key, object);
  }

  createUploadUrl(request: UploadUrlRequest): Promise<UploadUrl> {
    this.signed.push(request);
    return Promise.resolve({
      url: `memory://upload/${request.key}`,
      expiresAt: '2026-10-23T12:05:00.000Z',
    });
  }

  createReadUrl(key: string): Promise<string> {
    return Promise.resolve(`memory://read/${key}`);
  }

  head(key: string): Promise<StoredObject | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  remove(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }
}
