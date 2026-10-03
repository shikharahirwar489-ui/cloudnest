export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  starred: boolean;
  folderId: string | null;
  shareId?: string;
  url?: string;
}
export interface FolderItem { id: string; name: string; createdAt: string }
