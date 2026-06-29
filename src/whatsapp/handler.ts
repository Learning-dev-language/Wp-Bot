import { WASocket, WAMessage, proto } from '@adiwajshing/baileys';
import { extractUrls, validateDownloadUrl } from '../services/url-detector';
import { getFormattedMetadata } from '../downloader/metadata';
import { downloadService } from '../services/download';
import { queueManager } from '../queue/manager';
import { getUserRateLimiter } from '../services/rate-limiter';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import { formatDuration, formatFileSize } from '../utils/formatters';
import { handleStartCommand } from '../commands/start';
import { handleHelpCommand } from '../commands/help';
import { handleStatusCommand } from '../commands/status';
import { handleCancelCommand } from '../commands/cancel';
import { handleQueueCommand } from '../commands/queue';

const logger = createChildLogger('message-handler');

type QualityOption = 'bestaudio' | '360p' | '480p' | '720p' | 'best';

const QUALITY_OPTIONS: Record<string, QualityOption> = {
  'best_audio': 'bestaudio',
  '360p': '360p',
  '480p': '480p',
  '720p': '720p',
  'best_available': 'best',
};

export async function handleMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  const message = msg.messages?.[0];
  if (!message?.message) return;

  const jid = message.key.remoteJid;
  if (!jid) return;

  const userId = jid.split('@')[0];
  const text = message.message.conversation || 
               message.message.extendedTextMessage?.text || 
               '';

  // Check rate limit
  const rateLimiter = getUserRateLimiter(userId);
  try {
    await rateLimiter.schedule(() => Promise.resolve());
  } catch (error) {
    await sock.sendMessage(jid, { 
      text: '⚠️ Rate limit exceeded. Please wait before making another request.' 
    });
    return;
  }

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommands(sock, jid, userId, text);
    return;
  }

  // Check for URLs in message
  const urls = extractUrls(text);
  if (urls.length === 0) return;

  // Process first URL found
  const url = urls[0];
  
  try {
    // Validate URL
    const validation = validateDownloadUrl(url);
    if (!validation.valid) {
      await sock.sendMessage(jid, { text: `❌ ${validation.reason}` });
      return;
    }

    // Send "processing" message
    await sock.sendMessage(jid, { text: '🔍 Analyzing URL...' });

    // Get metadata
    const metadata = await getFormattedMetadata(url);
    
    // Send metadata and quality options
    const message = formatMetadataMessage(metadata);
    const interactiveMessage = await sock.sendMessage(jid, { text: message });

    // Wait for quality selection
    // This is handled in the next message from user
  } catch (error: any) {
    logger.error({ error: error.message, userId, url }, 'Error processing URL');
    await sock.sendMessage(jid, { 
      text: `❌ Failed to process URL: ${error.message}` 
    });
  }
}

async function handleCommands(
  sock: WASocket, 
  jid: string, 
  userId: string, 
  text: string
): Promise<void> {
  const [command, ...args] = text.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'start':
      await handleStartCommand(sock, jid);
      break;
    case 'help':
      await handleHelpCommand(sock, jid);
      break;
    case 'status':
      await handleStatusCommand(sock, jid, userId);
      break;
    case 'cancel':
      await handleCancelCommand(sock, jid, userId);
      break;
    case 'queue':
      await handleQueueCommand(sock, jid, userId);
      break;
    default:
      await sock.sendMessage(jid, { 
        text: 'Unknown command. Type /help for available commands.' 
      });
  }
}

function formatMetadataMessage(metadata: any): string {
  return `📺 *${metadata.title}*\n\n` +
    `👤 Uploader: ${metadata.uploader}\n` +
    `⏱️ Duration: ${metadata.duration}\n` +
    `📊 Estimated Size: ${metadata.estimatedSize}\n\n` +
    `*Select Quality:*\n` +
    `1️⃣ Best Audio\n` +
    `2️⃣ 360p\n` +
    `3️⃣ 480p\n` +
    `4️⃣ 720p\n` +
    `5️⃣ Best Available Quality\n\n` +
    `Reply with the number (1-5) to start download.`;
                           }
