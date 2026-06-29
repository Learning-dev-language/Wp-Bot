import { WASocket } from '@adiwajshing/baileys';
import { queueManager } from '../queue/manager';

export async function handleQueueCommand(
  sock: WASocket, 
  jid: string, 
  userId: string
): Promise<void> {
  const stats = queueManager.getStats();
  const userTasks = queueManager.getUserTasks(userId);
  
  let message = '*📊 Queue Status*\n\n';
  message += `📈 *Overall Stats:*\n`;
  message += `• Active Downloads: ${stats.active}\n`;
  message += `• Waiting: ${stats.waiting}\n`;
  message += `• Completed: ${stats.completed}\n\n`;
  
  const userActiveTasks = userTasks.filter(t => 
    t.status === 'queued' || t.status === 'downloading' || t.status === 'uploading'
  );
  
  if (userActiveTasks.length > 0) {
    message += `*Your Active Downloads:*\n`;
    for (const task of userActiveTasks) {
      message += `• ${task.url.slice(0, 50)}... - ${task.status}\n`;
    }
  } else {
    message += `*Your Downloads:* None active\n`;
  }

  await sock.sendMessage(jid, { text: message });
                                           }
