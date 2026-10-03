import type { StorageProvider } from './StorageProvider';
import type { ReadableStream } from 'node:stream/web';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID;
const apiBase = (
  process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org'
).replace(/\/+$/, '');
function api(method: string) {
  if (!token || !chatId) throw new Error('Telegram storage is not configured');
  return `${apiBase}/bot${token}/${method}`;
}
export class TelegramStorageProvider implements StorageProvider {
  async upload({
    data,
    name,
    mime,
  }: {
    data: Buffer | ReadableStream;
    name: string;
    mime: string;
  }) {
    const bytes = Buffer.isBuffer(data)
      ? data
      : Buffer.from(await new Response(data as BodyInit).arrayBuffer());
    const form = new FormData();
    form.set('chat_id', chatId!);
    form.set(
      'document',
      new Blob([Uint8Array.from(bytes)], { type: mime }),
      name,
    );
    const response = await fetch(api('sendDocument'), {
      method: 'POST',
      body: form,
    });
    if (!response.ok) throw new Error('Telegram upload failed');
    const result = (await response.json()) as {
      ok: boolean;
      result?: {
        message_id: number;
        document?: { file_id: string; file_size?: number };
      };
    };
    const doc = result.result?.document;
    if (!result.ok || !doc)
      throw new Error('Telegram did not return a stored document');
    return {
      storageObjectId: doc.file_id,
      size: doc.file_size ?? bytes.length,
      meta: { messageId: result.result!.message_id },
    };
  }
  async download(id: string) {
    const meta = await this.getMetadata(id);
    if (!meta) throw new Error('Stored file not found');
    const filePath = (meta as { path?: string }).path;
    if (!filePath) throw new Error('Telegram did not return a file path');
    if (path.isAbsolute(filePath))
      return Readable.toWeb(
        createReadStream(filePath),
      ) as unknown as ReadableStream;
    const res = await fetch(`${apiBase}/file/bot${token}/${filePath}`);
    if (!res.ok || !res.body) throw new Error('Telegram download failed');
    return res.body as unknown as ReadableStream;
  }
  async getMetadata(id: string) {
    const r = await fetch(api('getFile'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ file_id: id }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      ok: boolean;
      result?: { file_size?: number; file_path?: string };
    };
    return j.ok && j.result
      ? ({
          size: j.result.file_size ?? 0,
          mime: 'application/octet-stream',
          path: j.result.file_path,
        } as { size: number; mime: string })
      : null;
  }
  async exists(id: string) {
    return (await this.getMetadata(id)) !== null;
  }
  async delete(
    _id: string,
    metadata?: Record<string, unknown>,
  ) {
    const messageId = Number(metadata?.messageId);
    if (!Number.isSafeInteger(messageId) || messageId <= 0)
      throw new Error('Telegram message details are missing; file was not deleted');
    const response = await fetch(api('deleteMessage'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (!response.ok || !result.ok)
      throw new Error(result.description || 'Telegram could not delete the stored file');
  }
}
