import cron from 'node-cron';
import { config } from '../config';
import { r2Storage } from './r2';
import { createChildLogger } from '../utils/logger';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

const logger = createChildLogger('cleanup');

export class CleanupService {
  private job: cron.ScheduledTask | null = null;

  start(): void {
    if (this.job) {
      logger.warn('Cleanup job already running');
      return;
    }

    this.job = cron.schedule(config.cleanup.schedule, async () => {
      logger.info('Starting cleanup job');
      await this.cleanLocalFiles();
      await this.cleanExpiredR2Files();
      logger.info('Cleanup job completed');
    });

    logger.info('Cleanup job scheduled');
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Cleanup job stopped');
    }
  }

  private async cleanLocalFiles(): Promise<void> {
    try {
      const tempDir = config.download.tempDir;
      const files = await readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = join(tempDir, file);
        const stats = await stat(filePath);
        
        if (now - stats.mtimeMs > config.cleanup.fileMaxAge) {
          await unlink(filePath);
          logger.info({ file }, 'Deleted old temp file');
        }
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to clean local files');
    }
  }

  private async cleanExpiredR2Files(): Promise<void> {
    // This would need to be implemented with R2 lifecycle policies
    // R2 doesn't have a list objects API that returns all objects efficiently
    // Instead, configure lifecycle rules in Cloudflare dashboard
    logger.info('R2 cleanup handled by lifecycle policies');
  }
}

export const cleanupService = new CleanupService();
