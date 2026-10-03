import 'server-only';
import type { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { TelegramStorageProvider } from './TelegramStorageProvider';
let provider: StorageProvider | undefined;
export function getStorageProvider(): StorageProvider { if (!provider) { const kind = process.env.STORAGE_PROVIDER ?? 'local'; if (kind === 'local') provider = new LocalStorageProvider(); else if (kind === 'telegram') provider = new TelegramStorageProvider(); else throw new Error('STORAGE_PROVIDER must be local or telegram'); } return provider; }
