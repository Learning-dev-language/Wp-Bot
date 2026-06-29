import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  ConnectionState
} from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import { setupAuth } from './auth';
import { handleMessage } from './handler';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import P from 'pino';

const logger = createChildLogger('whatsapp-client');

let sock: WASocket | null = null;
let reconnectAttempts = 0;

export async function startWhatsApp(): Promise<void> {
  const { state, saveCreds } = await setupAuth();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  
  logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
    },
    printQRInTerminal: true,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('QR Code received, scan with WhatsApp');
    }

    if (connection === 'close') {
      const shouldReconnect = 
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      logger.warn(
        { error: lastDisconnect?.error, shouldReconnect },
        'Connection closed'
      );

      if (shouldReconnect && reconnectAttempts < config.whatsapp.maxRetries) {
        reconnectAttempts++;
        setTimeout(() => {
          logger.info(`Reconnecting... Attempt ${reconnectAttempts}`);
          startWhatsApp();
        }, config.whatsapp.reconnectInterval);
      } else if (!shouldReconnect) {
        logger.info('Logged out by user');
      } else {
        logger.error('Max reconnection attempts reached');
      }
    } else if (connection === 'open') {
      logger.info('WhatsApp connection established');
      reconnectAttempts = 0;
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      await handleMessage(sock!, m);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error handling message');
    }
  });

  return sock;
}

export function getSocket(): WASocket | null {
  return sock;
    }
