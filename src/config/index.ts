import dotenv from 'dotenv';
dotenv.config();

export const config = {
  whatsapp: {
    sessionDir: process.env.SESSION_DIR || './sessions',
    maxRetries: parseInt(process.env.MAX_RETRIES || '5'),
    reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000'),
  },
  download: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '3'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '209715200'), // 200MB
    tempDir: process.env.TEMP_DIR || './temp',
    qualityOptions: ['bestaudio', '360p', '480p', '720p', 'best'] as const,
    timeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT || '600000'), // 10 minutes
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'whatsapp-downloads',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '5'),
  },
  cleanup: {
    schedule: process.env.CLEANUP_SCHEDULE || '0 */6 * * *', // Every 6 hours
    fileMaxAge: parseInt(process.env.FILE_MAX_AGE || '3600000'), // 1 hour
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production',
  },
};
