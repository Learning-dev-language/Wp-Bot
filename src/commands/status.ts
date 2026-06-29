import { WASocket } from '@adiwajshing/baileys';
import { queueManager } from '../queue/manager';
import { progressTracker } from '../downloader/progress';

export async function handleStatusCommand(
  sock: WASocket, 
  jid: string, 
  userId: string
): Promise<void> {
  const tasks = queueManager.getUserTasks(userId);
  
  if (tasks.length === 0) {
    await sock.sendMessage(jid, { text: '📭 You have no active or queued downloads.' });
    return;
  }

  let message = '*📊 Your Downloads Status*\n\n';
  
  for (const task of tasks) {
    const progress = progressTracker.getProgress(task.id);
    const statusEmoji = {
      queued: '⏳',
      downloading: '⬇️',
      uploading: '📤',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
    }[task.status];

    message += `${statusEmoji} *Task ${task.id.slice(0, 8)}*\n`;
    message += `   Status: ${task.status.toUpperCase()}\n`;
    message += `   Progress: ${progress?.progress || task.progress}%\n`;
    
    if (task.error) {
      message += `   Error: ${task.error}\n`;
    }
    
    message += '\n';
  }

  await sock.sendMessage(jid, { text: message });
  }
