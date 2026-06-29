import { WASocket } from '@adiwajshing/baileys';

export async function handleStartCommand(sock: WASocket, jid: string): Promise<void> {
  const message = `👋 *Welcome to Media Downloader Bot!*\n\n` +
    `I can download videos and audio from YouTube, TikTok, Instagram, Twitter, and many more platforms!\n\n` +
    `*How to use:*\n` +
    `1️⃣ Send me a link to any supported video/audio\n` +
    `2️⃣ I'll show you the video details and available qualities\n` +
    `3️⃣ Select your preferred quality\n` +
    `4️⃣ I'll download and send the file to you\n\n` +
    `*Commands:*\n` +
    `/help - Show all commands\n` +
    `/status - Check your active downloads\n` +
    `/cancel - Cancel your active downloads\n` +
    `/queue - View your download queue\n\n` +
    `Type /help for more detailed information.`;

  await sock.sendMessage(jid, { text: message });
                               }
