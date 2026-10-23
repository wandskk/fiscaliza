import {
  ERROR_MESSAGES,
  MAX_PHOTOS,
  photoFileSchema,
  type UploadUrlResponse,
} from '@fiscaliza/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  confirmInspectionPhoto,
  requestInspectionPhotoUpload,
} from '@/features/inspections/api/inspections.api';
import { ApiError } from '@/lib/http';
import { inspectionKeys } from './use-inspection';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  status: UploadStatus;
  // 0-100
  progress: number;
  error?: string;
}

const UPLOAD_FAILED = 'Não foi possível enviar a foto. Tente novamente.';

// PUT straight to the presigned URL. XMLHttpRequest because fetch has no upload progress.
// No Authorization header: the signature is in the URL and the Content-Type must be the signed one.
function putFile(
  target: UploadUrlResponse,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', target.url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(UPLOAD_FAILED));
    };
    xhr.onerror = () => reject(new Error(UPLOAD_FAILED));
    xhr.onabort = () => reject(new Error(UPLOAD_FAILED));
    xhr.send(file);
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return UPLOAD_FAILED;
}

// existingCount: photos already confirmed in the inspection (counts toward RN-05)
export function useUploadPhoto(inspectionId: string, existingCount: number) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const existingRef = useRef(existingCount);
  existingRef.current = existingCount;

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    itemsRef.current = itemsRef.current.map((item) =>
      item.id === id ? { ...item, ...change } : item,
    );
    setItems(itemsRef.current);
  }, []);

  const uploadOne = useCallback(
    async (id: string, file: File) => {
      try {
        patch(id, { status: 'uploading', progress: 0 });
        const target = await requestInspectionPhotoUpload(inspectionId, {
          contentType: file.type,
          size: file.size,
        });
        await putFile(target, file, (progress) => patch(id, { progress }));
        await confirmInspectionPhoto(inspectionId, { key: target.key });
        // Wait for the refetch so the confirmed photo is already in the list when this one leaves it
        await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
        await queryClient.invalidateQueries({ queryKey: inspectionKeys.siteListsRoot() });
        patch(id, { status: 'done', progress: 100 });
      } catch (error) {
        patch(id, { status: 'error', error: errorMessage(error) });
      }
    },
    [inspectionId, patch, queryClient],
  );

  const upload = useCallback(
    (files: File[]) => {
      // Finished uploads and old errors leave the list when a new selection starts
      const kept = itemsRef.current.filter(
        (item) => item.status === 'pending' || item.status === 'uploading',
      );
      let slots = MAX_PHOTOS - existingRef.current - kept.length;
      const created: UploadItem[] = [];
      const accepted: { id: string; file: File }[] = [];

      for (const file of files) {
        const id = crypto.randomUUID();
        const valid = photoFileSchema.safeParse({ contentType: file.type, size: file.size });
        if (!valid.success || slots <= 0) {
          // RN-05 also on the front, before calling the API
          created.push({
            id,
            name: file.name,
            status: 'error',
            progress: 0,
            error: ERROR_MESSAGES['RN-05'],
          });
          continue;
        }
        slots -= 1;
        created.push({ id, name: file.name, status: 'pending', progress: 0 });
        accepted.push({ id, file });
      }

      itemsRef.current = [...kept, ...created];
      setItems(itemsRef.current);
      for (const { id, file } of accepted) void uploadOne(id, file);
    },
    [uploadOne],
  );

  const isUploading = items.some(
    (item) => item.status === 'pending' || item.status === 'uploading',
  );

  return { items, upload, isUploading };
}
