import { isValidUrl, isSupportedDomain } from '../utils/validators';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('url-detector');

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function extractUrls(text: string): string[] {
  const urls = text.match(URL_PATTERN) || [];
  return urls.filter(url => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

export function validateDownloadUrl(url: string): { valid: boolean; reason?: string } {
  if (!isValidUrl(url)) {
    return { valid: false, reason: 'Invalid URL format' };
  }
  
  // We don't strictly check supported domains since yt-dlp supports thousands
  // Instead, we'll let yt-dlp handle the validation
  
  return { valid: true };
}
