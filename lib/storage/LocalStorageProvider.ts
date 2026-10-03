import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import type { StorageProvider } from './StorageProvider';
const root = path.join(process.cwd(), 'uploads');
function safe(id: string) { if (!/^[\w-]+$/.test(id)) throw new Error('Invalid storage object'); return path.join(root, id); }
export class LocalStorageProvider implements StorageProvider {
  async upload({ data }: { data: Buffer | ReadableStream; name: string; mime: string }) { await mkdir(root, { recursive: true }); const id = randomUUID(); const buffer = Buffer.isBuffer(data) ? data : Buffer.from(await new Response(data as BodyInit).arrayBuffer()); await writeFile(safe(id), buffer, { flag: 'wx' }); return { storageObjectId: id, size: buffer.byteLength }; }
  async download(id: string) { const buffer = await readFile(safe(id)); return Readable.toWeb(Readable.from([buffer])) as unknown as ReadableStream; }
  async delete(id: string) { try { await unlink(safe(id)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; } }
  async getMetadata(id: string) { try { const info = await stat(safe(id)); return { size: info.size, mime: 'application/octet-stream' }; } catch { return null; } }
  async exists(id: string) { return (await this.getMetadata(id)) !== null; }
}
