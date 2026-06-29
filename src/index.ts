import { startWhatsApp } from './whatsapp/client';
import { cleanupService } from './storage/cleanup';
import { config } from './config';
import { createChildLogger } from './utils/logger';
import { mkdir } from 'fs/promises';

const logger = createChildLogger('main');

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting WhatsApp Downloader Bot...');
    
    // Ensure required directories exist
    await mkdir(config.download.tempDir, { recursive: true });
    await mkdir(config.whatsapp.sessionDir, { recursive: true });
    
    // Start cleanup service
    cleanupService.start();
    
    // Start WhatsApp client
    await startWhatsApp();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      cleanupService.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      cleanupService.stop();
      process.exit(0);
    });
    
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start bot');
    process.exit(1);
  }
}

bootstrap();
