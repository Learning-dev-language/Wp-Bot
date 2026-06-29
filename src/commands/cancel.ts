import { WASocket } from '@adiwajshing/baileys';
import { queueManager } from '../queue/manager';

export async function handleCancelCommand(
  sock: WASocket, 
  jid: string, 
  userId: string
): Promise<void> {
  const cancelledCount = queueManager.cancelAllUserTasks(userId);
  
  if (cancelledCount === 0) {
    await sock.sendMessage(jid, { text: '📭 No active downloads to cancel.' });
  } else {
    await sock.sendMessage(jid, { 
      text: `✅ Cancelled ${cancelledCount} download(s).` 
    });
  }
}
