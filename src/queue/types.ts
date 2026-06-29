export interface DownloadTask {
  id: string;
  userId: string;
  url: string;
  format: string;
  status: 'queued' | 'downloading' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  metadata?: any;
  error?: string;
  filePath?: string;
  priority?: number;
}

export interface QueueStats {
  total: number;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  cancelled: number;
}
