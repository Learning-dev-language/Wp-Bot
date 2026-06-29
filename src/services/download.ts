import { YtDlpWrapper } from '../downloader/ytdlp';
import { getFormattedMetadata, estimateFileSize } from '../downloader/metadata';
import { progressTracker } from '../downloader/progress';
import { queueManager } from '../queue/manager';
import { r2Storage } from '../storage/r2';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import { formatFileSize } from '../utils/formatters';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

const logger = createChildLogger('download-service');
const ytdlp = new YtDlpWrapper();

export class DownloadService {
  async handleDownload(userId: string, url: string, format: string): Promise<string> {
    // Create temp directory if it doesn't exist
    await fs.mkdir(config.download.tempDir, { recursive: true });

    // Add task to queue
    const taskId = await queueManager.addTask(userId, url, format);
    
    // Start download in background
    this.processDownload(taskId, userId, url, format).catch(error => {
      logger.error({ error: error.message, taskId }, 'Download processing failed');
      queueManager.updateTask(taskId, { status: 'failed', error: error.message });
      progressTracker.updateProgress({ downloadId: taskId, userId, url, status: 'failed', error: error.message });
    });

    return taskId;
  }

  private async processDownload(taskId: string, userId: string, url: string, format: string): Promise<void> {
    try {
      // Check file size
      const estimatedSize = await estimateFileSize(url, format);
      if (estimatedSize && estimatedSize > config.download.maxFileSize) {
        throw new Error(`File size (${formatFileSize(estimatedSize)}) exceeds maximum allowed size (${formatFileSize(config.download.maxFileSize)})`);
      }

      // Update status
      queueManager.updateTask(taskId, { 
        status: 'downloading', 
        startedAt: new Date() 
      });
      progressTracker.updateProgress({ 
        downloadId: taskId, 
        userId, 
        url, 
        status: 'downloading' 
      });

      // Download file
      const outputPath = path.join(config.download.tempDir, taskId);
      const filePath = await ytdlp.download({
        url,
        format,
        outputPath,
        onProgress: (progress) => {
          queueManager.updateTask(taskId, { progress });
          progressTracker.updateProgress({ 
            downloadId: taskId, 
            userId, 
            url, 
            progress,
            status: 'downloading' 
          });
        },
      });

      // Upload to R2
      queueManager.updateTask(taskId, { status: 'uploading' });
      progressTracker.updateProgress({ downloadId: taskId, userId, url, status: 'uploading' });
      
      const fileName = path.basename(filePath);
      const r2Key = await r2Storage.uploadFile(filePath, `${taskId}-${fileName}`);

      // Generate download URL
      const downloadUrl = await r2Storage.getDownloadUrl(r2Key);

      // Update task
      queueManager.updateTask(taskId, { 
        status: 'completed', 
        completedAt: new Date(),
        filePath: r2Key 
      });
      progressTracker.updateProgress({ 
        downloadId: taskId, 
        userId, 
        url, 
        status: 'completed' 
      });

      logger.info({ taskId, r2Key }, 'Download and upload completed successfully');
    } catch (error: any) {
      queueManager.updateTask(taskId, { 
        status: 'failed', 
        error: error.message,
        completedAt: new Date() 
      });
      progressTracker.updateProgress({ 
        downloadId: taskId, 
        userId, 
        url, 
        status: 'failed', 
        error: error.message 
      });
      throw error;
    }
  }

  async getDownloadUrl(taskId: string): Promise<string | null> {
    const task = queueManager.getTask(taskId);
    if (!task || task.status !== 'completed' || !task.filePath) {
      return null;
    }
    
    return await r2Storage.getDownloadUrl(task.filePath);
  }

  async cleanupDownload(taskId: string): Promise<void> {
    const task = queueManager.getTask(taskId);
    if (task?.filePath) {
      await r2Storage.deleteFile(task.filePath);
    }
    progressTracker.removeDownload(taskId);
  }
}

export const downloadService = new DownloadService();
