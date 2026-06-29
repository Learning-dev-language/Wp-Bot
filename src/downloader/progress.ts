import { EventEmitter } from 'events';

export interface ProgressInfo {
  downloadId: string;
  userId: string;
  url: string;
  progress: number;
  speed?: string;
  eta?: string;
  status: 'downloading' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export class ProgressTracker extends EventEmitter {
  private downloads: Map<string, ProgressInfo> = new Map();

  updateProgress(info: Partial<ProgressInfo> & { downloadId: string }): void {
    const existing = this.downloads.get(info.downloadId) || {
      downloadId: info.downloadId,
      userId: '',
      url: '',
      progress: 0,
      status: 'downloading' as const,
    };
    
    const updated = { ...existing, ...info };
    this.downloads.set(info.downloadId, updated);
    this.emit('progress', updated);
  }

  getProgress(downloadId: string): ProgressInfo | undefined {
    return this.downloads.get(downloadId);
  }

  removeDownload(downloadId: string): void {
    this.downloads.delete(downloadId);
  }

  getUserDownloads(userId: string): ProgressInfo[] {
    return Array.from(this.downloads.values())
      .filter(d => d.userId === userId);
  }
}

export const progressTracker = new ProgressTracker();
