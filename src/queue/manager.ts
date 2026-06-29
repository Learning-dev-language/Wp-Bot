import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { config } from '../config';
import { DownloadTask, QueueStats } from './types';
import { createChildLogger } from '../utils/logger';
import pLimit from 'p-limit';

const logger = createChildLogger('queue-manager');

export class DownloadQueueManager extends EventEmitter {
  private queue: Map<string, DownloadTask> = new Map();
  private userQueues: Map<string, string[]> = new Map();
  private limiter: pLimit.Limit;

  constructor() {
    super();
    this.limiter = pLimit(config.download.maxConcurrent);
  }

  async addTask(userId: string, url: string, format: string, priority: number = 0): Promise<string> {
    const taskId = uuidv4();
    const task: DownloadTask = {
      id: taskId,
      userId,
      url,
      format,
      status: 'queued',
      addedAt: new Date(),
      progress: 0,
      priority,
    };

    this.queue.set(taskId, task);
    
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(userId, []);
    }
    this.userQueues.get(userId)!.push(taskId);

    logger.info({ taskId, userId, url }, 'Task added to queue');
    this.emit('taskAdded', task);
    
    return taskId;
  }

  async getNextTask(): Promise<DownloadTask | null> {
    let nextTask: DownloadTask | null = null;
    let highestPriority = -Infinity;

    for (const [taskId, task] of this.queue) {
      if (task.status === 'queued' && task.priority! > highestPriority) {
        nextTask = task;
        highestPriority = task.priority!;
      }
    }

    return nextTask;
  }

  updateTask(taskId: string, updates: Partial<DownloadTask>): void {
    const task = this.queue.get(taskId);
    if (task) {
      Object.assign(task, updates);
      this.queue.set(taskId, task);
      this.emit('taskUpdated', task);
    }
  }

  cancelTask(taskId: string): boolean {
    const task = this.queue.get(taskId);
    if (task && (task.status === 'queued' || task.status === 'downloading')) {
      task.status = 'cancelled';
      task.completedAt = new Date();
      this.queue.set(taskId, task);
      
      const userQueue = this.userQueues.get(task.userId);
      if (userQueue) {
        const index = userQueue.indexOf(taskId);
        if (index > -1) {
          userQueue.splice(index, 1);
        }
      }
      
      this.emit('taskCancelled', task);
      logger.info({ taskId }, 'Task cancelled');
      return true;
    }
    return false;
  }

  cancelAllUserTasks(userId: string): number {
    const userQueue = this.userQueues.get(userId) || [];
    let cancelledCount = 0;

    for (const taskId of userQueue) {
      if (this.cancelTask(taskId)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.queue.get(taskId);
  }

  getUserTasks(userId: string): DownloadTask[] {
    const userQueue = this.userQueues.get(userId) || [];
    return userQueue
      .map(taskId => this.queue.get(taskId))
      .filter((task): task is DownloadTask => task !== undefined);
  }

  getStats(): QueueStats {
    const tasks = Array.from(this.queue.values());
    return {
      total: tasks.length,
      active: tasks.filter(t => t.status === 'downloading' || t.status === 'uploading').length,
      waiting: tasks.filter(t => t.status === 'queued').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [taskId, task] of this.queue) {
      if (
        (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') &&
        task.completedAt &&
        now - task.completedAt.getTime() > 3600000 // 1 hour
      ) {
        this.queue.delete(taskId);
        const userQueue = this.userQueues.get(task.userId);
        if (userQueue) {
          const index = userQueue.indexOf(taskId);
          if (index > -1) {
            userQueue.splice(index, 1);
          }
        }
      }
    }
  }
}

export const queueManager = new DownloadQueueManager();
