import { YtDlpWrapper, MediaMetadata } from './ytdlp';
import { formatDuration, formatFileSize, truncateText } from '../utils/formatters';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('metadata');
const ytdlp = new YtDlpWrapper();

export interface FormattedMetadata {
  title: string;
  duration: string;
  uploader: string;
  estimatedSize: string;
  availableFormats: string;
  url: string;
}

export async function getFormattedMetadata(url: string): Promise<FormattedMetadata> {
  const metadata = await ytdlp.extractMetadata(url);
  
  const formats = await ytdlp.getAvailableFormats(url);
  
  return {
    title: truncateText(metadata.title, 100),
    duration: metadata.duration ? formatDuration(metadata.duration) : 'Unknown',
    uploader: metadata.uploader || 'Unknown',
    estimatedSize: 'Depends on quality',
    availableFormats: formatQualityOptions(formats),
    url: metadata.webpage_url,
  };
}

function formatQualityOptions(formats: any[]): string {
  const options: string[] = [];
  
  // Audio option
  options.push('🎵 *Best Audio*');
  
  // Video qualities
  const qualities = ['360p', '480p', '720p'];
  for (const quality of qualities) {
    const hasQuality = formats.some(f => 
      f.format_note === quality || 
      (f.height && f.height <= parseInt(quality) && f.height > parseInt(quality) - 240)
    );
    if (hasQuality) {
      options.push(`📹 *${quality}*`);
    }
  }
  
  // Best quality
  options.push('✨ *Best Available Quality*');
  
  return options.join('\n');
}

export async function estimateFileSize(url: string, format: string): Promise<number | null> {
  const metadata = await ytdlp.extractMetadata(url);
  const selectedFormat = metadata.formats.find(f => 
    f.format_note?.includes(format) || f.id === format
  );
  
  return selectedFormat?.filesize || null;
}
