import type { ReadableStream } from 'node:stream/web';
export interface StorageProvider {
  upload(input: {
    data: Buffer | ReadableStream;
    name: string;
    mime: string;
  }): Promise<{
    storageObjectId: string;
    size: number;
    meta?: Record<string, unknown>;
  }>;
  download(storageObjectId: string): Promise<ReadableStream>;
  delete(
    storageObjectId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  getMetadata(
    storageObjectId: string,
  ): Promise<{ size: number; mime: string } | null>;
  exists(storageObjectId: string): Promise<boolean>;
}
