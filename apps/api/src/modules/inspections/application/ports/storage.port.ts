export interface UploadUrlRequest {
  key: string;
  contentType: string;
  size: number;
}

export interface UploadUrl {
  url: string;
  expiresAt: string;
}

export interface StoredObject {
  contentType: string;
  size: number;
}

export interface Storage {
  createUploadUrl(request: UploadUrlRequest): Promise<UploadUrl>;
  createReadUrl(key: string): Promise<string>;
  head(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
}

export const STORAGE = Symbol('STORAGE');
