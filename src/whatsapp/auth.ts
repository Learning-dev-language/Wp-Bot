import { useMultiFileAuthState } from '@adiwajshing/baileys';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const logger = createChildLogger('whatsapp-auth');

export async function setupAuth() {
  const sessionDir = path.resolve(config.whatsapp.sessionDir);
  
  // Ensure session directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    logger.info(`Created session directory: ${sessionDir}`);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  logger.info('WhatsApp authentication initialized');
  
  return { state, saveCreds };
}
