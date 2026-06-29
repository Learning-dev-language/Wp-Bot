import { WASocket } from '@adiwajshing/baileys';

export async function handleHelpCommand(sock: WASocket, jid: string): Promise<void> {
  const message = `📚 *Available Commands*\n\n` +
    `*Basic Commands:*\n` +
    `/start - Start the bot and see welcome message\n` +
    `/help - Show this help message\n\n` +
    `*Download Commands:*\n` +
    `Send any supported URL to start downloading\n` +
    `Supported formats: Best Audio, 360p, 480p, 720p, Best Available\n\n` +
    `*Management Commands:*\n` +
    `/status - Check your active and queued downloads\n` +
    `/cancel - Cancel all your active downloads\n` +
    `/queue - View your download queue position\n\n` +
    `*Supported Platforms:*\n` +
    `• YouTube & YouTube Music\n` +
    `• TikTok\n` +
    `• Instagram (Posts, Reels)\n` +
    `• Twitter/X\n` +
    `• Facebook\n` +
    `• Vimeo\n` +
    `• Reddit\n` +
    `• Twitch\n` +
    `• DailyMotion\n` +
    `• And 1000+ more sites supported by yt-dlp\n\n` +
    `*Limits:*\n` +
    `• Max file size: 200MB\n` +
    `• Rate limit: 5 requests per minute\n` +
    `• Max concurrent downloads: 3\n\n` +
    `Need help? Contact the bot administrator.`;

  await sock.sendMessage(jid, { text: message });
    }
