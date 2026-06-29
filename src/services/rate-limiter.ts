import Bottleneck from 'bottleneck';
import { config } from '../config';

const userLimiters = new Map<string, Bottleneck>();

export function getUserRateLimiter(userId: string): Bottleneck {
  if (!userLimiters.has(userId)) {
    const limiter = new Bottleneck({
      minTime: config.rateLimit.windowMs / config.rateLimit.maxRequests,
      maxConcurrent: 1,
      reservoir: config.rateLimit.maxRequests,
      reservoirRefreshAmount: config.rateLimit.maxRequests,
      reservoirRefreshInterval: config.rateLimit.windowMs,
    });
    
    userLimiters.set(userId, limiter);
  }
  
  return userLimiters.get(userId)!;
}

export function removeUserRateLimiter(userId: string): void {
  const limiter = userLimiters.get(userId);
  if (limiter) {
    limiter.stop();
    userLimiters.delete(userId);
  }
}
