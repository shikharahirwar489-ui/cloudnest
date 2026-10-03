'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cloud,
  Clock3,
  Star,
  Users,
  Trash2,
  Settings,
  Search,
  Upload,
  FolderPlus,
  Grid2X2,
  List,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Loader2,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { Logo } from './Logo';
type Entry = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  starred: boolean;
  folderId: string | null;
  shareId?: string;
  url?: string;
};
type Folder = { id: string; name: string; createdAt: string };
const nav = [
  ['My Drive', '/dashboard', Cloud],
  ['Recent', '/dashboard/recent', Clock3],
  ['Starred', '/dashboard/starred', Star],
  ['Shared', '/dashboard/shared', Users],
  ['Trash', '/dashboard/trash', Trash2],
] as const;
export function Dashboard({
  view = 'drive',
  folderId,
}: {
  view?: string;
  folderId?: string;
}) {
  const [files, setFiles] = useState<Entry[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [query, setQuery] = useState(''),
    [loading, setLoading] = useState(true),
    [used, setUsed] = useState(0),
    [quota, setQuota] = useState(0),
    [storageProvider, setStorageProvider] = useState('local'),
    [maxUploadBytes, setMaxUploadBytes] = useState(50 * 1024 * 1024),
    [uploading, setUploading] = useState(false),
    [progress, setProgress] = useState(0),
    [toast, setToast] = useState('');
  const path = usePathname(),
    router = useRouter();
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/files?page=1&view=${encodeURIComponent(view)}`;
      if (folderId) url += `&folderId=${encodeURIComponent(folderId)}`;
      const [fr, sr] = await Promise.all([
        view === 'shared' ? fetch('/api/share') : fetch(url),
        fetch('/api/storage'),
      ]);
      if (fr.status === 401) {
        router.push('/login');
        return;
      }
      const f = await fr.json();
      setFiles(
        Array.isArray(f)
          ? f.filter((x: Entry & { deletedAt: string | null }) =>
              view === 'trash' ? !!x.deletedAt : !x.deletedAt,
            )
          : [],
      );
      const st = await sr.json();
      setUsed(st.used || 0);
      setQuota(st.quota || 0);
      setMaxUploadBytes(st.maxUploadBytes || 50 * 1024 * 1024);
      setStorageProvider(st.storageProvider || 'local');
      if (!folderId && view === 'drive') {
        const r = await fetch('/api/folders');
        if (r.ok) setFolders(await r.json());
      }
    } finally {
      setLoading(false);
    }
  }, [view, folderId, router]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!query.trim()) {
      if (view === 'search') setFiles([]);
      return;
    }
    const t = setTimeout(
      () =>
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((x) => setFiles(Array.isArray(x) ? x : [])),
      250,
    );
    return () => clearTimeout(t);
  }, [query, view]);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(''), 2600);
  };
  async function mutate(id: string, body: object) {
    const r = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      await refresh();
      notify('File updated');
    }
  }
  async function shareFile(id: string) {
    const r = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileId: id, allowDownload: true }),
    });
    const j = await r.json();
    if (r.ok) {
      await navigator.clipboard.writeText(j.url);
      notify('Share link copied');
    } else notify(j.error || 'Could not create share');
  }
  async function newFolder() {
    const name = prompt('Folder name');
    if (!name) return;
    const r = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, parentId: folderId || null }),
    });
    if (r.ok) {
      const x = await r.json();
      setFolders((v) => [...v, x]);
      notify('Folder created');
    }
  }
  async function upload(list: FileList | null) {
    if (!list?.length || uploading) return;
    setUploading(true);
    const selected = Array.from(list),
      errors: string[] = [];
    let completed = 0;
    for (let index = 0; index < selected.length; index++) {
      const file = selected[index];
      if (file.size > maxUploadBytes) {
        errors.push(
          `${file.name} is larger than the ${Math.floor(maxUploadBytes / 1024 / 1024)} MB limit`,
        );
        continue;
      }
      const data = new FormData();
      data.set('file', file);
      if (folderId) data.set('folderId', folderId);
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(
                Math.round(
                  ((index + e.loaded / e.total) / selected.length) * 100,
                ),
              );
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              completed++;
              resolve();
            } else {
              try {
                const result = JSON.parse(xhr.responseText);
                reject(
                  new Error(result.error || `Upload failed (${xhr.status})`),
                );
              } catch (error) {
                reject(
                  error instanceof Error
                    ? error
                    : new Error(`Upload failed (${xhr.status})`),
                );
              }
            }
          };
          xhr.onerror = () => reject(new Error('Connection lost'));
          xhr.onabort = () => reject(new Error('Upload cancelled'));
          xhr.send(data);
        });
      } catch (error) {
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`,
        );
      }
    }
    setUploading(false);
    setProgress(0);
    await refresh();
    notify(
      errors.length
        ? `${completed} uploaded; ${errors.length} failed. ${errors[0]}`
        : `${completed} file${completed === 1 ? '' : 's'} uploaded`,
    );
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  const title =
    view === 'search'
      ? 'Search'
      : view === 'trash'
        ? 'Trash'
        : view === 'starred'
          ? 'Starred'
          : view === 'recent'
            ? 'Recent'
            : view === 'shared'
              ? 'Shared'
              : 'My Drive';
  function fmt(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line px-4 py-5 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <label className="mt-8 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) router.push('/dashboard/search');
            }}
            placeholder="Search files"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <Link
          href="/dashboard"
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-500 font-medium"
        >
          <Upload size={17} /> Upload files
          <input
            aria-label="Upload files"
            type="file"
            multiple
            disabled={uploading}
            className="absolute h-11 w-48 cursor-pointer opacity-0"
            onChange={(e) => {
              upload(e.target.files);
              e.currentTarget.value = '';
            }}
          />
        </Link>
        <nav className="mt-6 space-y-1">
          {nav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${path === href ? 'bg-white/[.07] text-white' : 'text-muted hover:bg-white/[.04]'}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="surface rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs">
              <HardDrive size={15} />
              <span>Storage</span>
            </div>
            <div className="mt-3 h-1.5 rounded bg-line">
              <div
                className="h-full rounded bg-brand"
                style={{
                  width: `${quota ? Math.min(100, (used / quota) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {fmt(used)} of {fmt(quota)}
            </p>
          </div>
          <Link
            href="/settings"
            className="mt-4 flex items-center gap-3 px-3 py-3 text-sm text-muted"
          >
            <Settings size={18} />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-muted"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-5 md:px-8">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted md:block">
            Personal workspace <span className="mx-2">/</span>
            <span className="text-white">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newFolder}
              className="flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm"
            >
              <FolderPlus size={16} />
              <span className="hidden sm:inline">New folder</span>
            </button>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-indigo-500 px-3 text-sm font-medium">
              <Upload size={16} />
              <span>Upload</span>
              <input
                aria-label="Upload files"
                type="file"
                multiple
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  upload(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        </header>
        <section className="px-5 py-7 md:px-8">
          {view === 'trash' && storageProvider === 'telegram' && (
            <p className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Files are stored in Telegram. Removing a file here removes it from
              CloudNest, but Telegram may retain its stored copy.
            </p>
          )}
          {uploading && (
            <div
              className="mb-5 rounded-lg border border-line bg-panel p-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex justify-between text-sm">
                <span>Uploading files…</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-line">
                <div
                  className="h-full rounded bg-brand transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Maximum file size: {Math.floor(maxUploadBytes / 1024 / 1024)} MB
              </p>
            </div>
          )}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted">FILES</p>
              <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
            </div>
            <div className="hidden items-center gap-2 text-muted sm:flex">
              <button
                aria-label="Grid view"
                className="rounded-md bg-white/[.08] p-2"
              >
                <Grid2X2 size={17} />
              </button>
              <button aria-label="List view" className="p-2">
                <List size={17} />
              </button>
            </div>
          </div>
          {!folderId && view === 'drive' && folders.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/dashboard/folder/${folder.id}`}
                  className="surface flex items-center gap-3 rounded-xl p-4"
                >
                  <FolderPlus size={18} className="text-brand" />
                  <span className="truncate text-sm">{folder.name}</span>
                </Link>
              ))}
            </div>
          )}
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted">
              <Loader2 className="animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="surface mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl px-5 text-center">
              <div className="rounded-xl bg-indigo-500/10 p-4 text-brand">
                <Cloud size={25} />
              </div>
              <h2 className="mt-4 text-lg font-medium">
                {view === 'trash'
                  ? 'Trash is empty'
                  : view === 'search'
                    ? 'No matching files'
                    : `Nothing in ${title.toLowerCase()} yet`}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                {view === 'trash'
                  ? 'Deleted files will appear here, where you can restore or remove them permanently.'
                  : 'Upload a file to start building your personal cloud.'}
              </p>
              {view !== 'trash' && (
                <label className="mt-5 cursor-pointer rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium">
                  Upload a file
                  <input
                    type="file"
                    disabled={uploading}
                    className="hidden"
                    onChange={(e) => {
                      upload(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[1fr_110px_110px_40px] border-b border-line px-4 py-3 text-xs text-muted">
                <span>Name</span>
                <span>Size</span>
                <span>Added</span>
                <span />
              </div>
              {files.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[1fr_110px_110px_40px] items-center border-b border-line/70 px-4 py-3 text-sm last:border-0"
                >
                  <a
                    href={`/api/files/${f.id}`}
                    target="_blank"
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span className="rounded-md bg-indigo-500/10 p-2 text-brand">
                      {f.mimeType.startsWith('image/') ? (
                        <ImageIcon size={17} />
                      ) : f.mimeType.startsWith('video/') ? (
                        <Film size={17} />
                      ) : f.mimeType.startsWith('audio/') ? (
                        <Music size={17} />
                      ) : (
                        <FileText size={17} />
                      )}
                    </span>
                    <span className="truncate">{f.name}</span>
                  </a>
                  <span className="text-xs text-muted">{fmt(f.size)}</span>
                  <span className="text-xs text-muted">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                  <div className="group relative">
                    <button
                      aria-label={`Actions for ${f.name}`}
                      className="rounded p-2 text-muted"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    <div className="absolute right-0 top-8 z-20 hidden w-40 rounded-lg border border-line bg-panel p-1 shadow-xl group-focus-within:block group-hover:block">
                      <button
                        onClick={() => mutate(f.id, { starred: !f.starred })}
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                      >
                        {f.starred ? 'Unstar' : 'Star'}
                      </button>
                      <button
                        onClick={() => shareFile(f.id)}
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                      >
                        Create share link
                      </button>
                      <button
                        onClick={() => {
                          const n = prompt('New file name', f.name);
                          if (n) mutate(f.id, { name: n });
                        }}
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => mutate(f.id, { folderId: null })}
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                      >
                        Move to My Drive
                      </button>
                      {folders
                        .filter((folder) => folder.id !== f.folderId)
                        .map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() =>
                              mutate(f.id, { folderId: folder.id })
                            }
                            className="w-full truncate rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                          >
                            Move to {folder.name}
                          </button>
                        ))}
                      {view === 'shared' && f.shareId && (
                        <>
                          <button
                            onClick={() =>
                              f.url &&
                              navigator.clipboard
                                .writeText(f.url)
                                .then(() => notify('Share link copied'))
                            }
                            className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                          >
                            Copy share link
                          </button>
                          <button
                            onClick={async () => {
                              await fetch(`/api/share/${f.shareId}`, {
                                method: 'DELETE',
                              });
                              await refresh();
                              notify('Share revoked');
                            }}
                            className="w-full rounded px-3 py-2 text-left text-xs text-red-400 hover:bg-white/[.06]"
                          >
                            Revoke share
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          mutate(f.id, {
                            action: view === 'trash' ? 'restore' : 'trash',
                          })
                        }
                        className="w-full rounded px-3 py-2 text-left text-xs hover:bg-white/[.06]"
                      >
                        {view === 'trash' ? 'Restore' : 'Move to trash'}
                      </button>
                      {view === 'trash' && (
                        <button
                          onClick={async () => {
                            const prompt =
                              storageProvider === 'telegram'
                                ? 'Remove this file from CloudNest? Telegram may retain the stored copy.'
                                : 'Permanently delete this file?';
                            if (confirm(prompt)) {
                              const response = await fetch(
                                `/api/files/${f.id}`,
                                {
                                  method: 'DELETE',
                                },
                              );
                              if (response.ok) refresh();
                              else
                                notify(
                                  'Could not remove the file. Please try again.',
                                );
                            }
                          }}
                          className="w-full rounded px-3 py-2 text-left text-xs text-red-400 hover:bg-white/[.06]"
                        >
                          {storageProvider === 'telegram'
                            ? 'Remove from CloudNest'
                            : 'Delete permanently'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {toast && (
          <div
            role="status"
            className="fixed bottom-5 right-5 rounded-lg border border-line bg-panel px-4 py-3 text-sm shadow-xl"
          >
            {toast}
          </div>
        )}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-ink px-2 py-2 md:hidden">
          {nav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] ${path === href ? 'text-brand' : 'text-muted'}`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
