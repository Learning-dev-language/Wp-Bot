import { exec } from 'child_process';
import { promisify } from 'util';
import { createChildLogger } from '../utils/logger';
import { config } from '../config';

const execAsync = promisify(exec);
const logger = createChildLogger('ytdlp');

export interface DownloadOptions {
  url: string;
  format: string;
  outputPath: string;
  onProgress?: (progress: number) => void;
}

export interface FormatInfo {
  id: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  format_note?: string;
  acodec?: string;
  vcodec?: string;
}

export interface MediaMetadata {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  uploader?: string;
  upload_date?: string;
  thumbnail?: string;
  webpage_url: string;
  formats: FormatInfo[];
}

export class YtDlpWrapper {
  private checkYtDlp(): Promise<void> {
    return execAsync('yt-dlp --version')
      .then(() => {})
      .catch(() => {
        throw new Error('yt-dlp is not installed. Please install it: pip install yt-dlp');
      });
  }

  async extractMetadata(url: string): Promise<MediaMetadata> {
    await this.checkYtDlp();
    
    const command = `yt-dlp -j "${url}" --no-download --no-check-certificate`;
    
    try {
      const { stdout } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });
      
      const metadata = JSON.parse(stdout);
      return this.parseMetadata(metadata);
    } catch (error: any) {
      logger.error({ error: error.message, url }, 'Failed to extract metadata');
      throw new Error(`Failed to extract metadata: ${error.message}`);
    }
  }

  async getAvailableFormats(url: string): Promise<FormatInfo[]> {
    const metadata = await this.extractMetadata(url);
    return this.filterFormats(metadata.formats);
  }

  async download(options: DownloadOptions): Promise<string> {
    await this.checkYtDlp();
    
    const formatArg = this.buildFormatArg(options.format);
    const outputTemplate = `${options.outputPath}/%(title)s.%(ext)s`;
    
    const command = `yt-dlp -f "${formatArg}" -o "${outputTemplate}" "${options.url}" --no-check-certificate --newline --progress`;
    
    return new Promise((resolve, reject) => {
      const process = exec(command, {
        timeout: config.download.timeoutMs,
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
      });
      
      let lastOutput = '';
      
      if (process.stdout) {
        process.stdout.on('data', (data: string) => {
          const progress = this.parseProgress(data);
          if (progress !== null && options.onProgress) {
            options.onProgress(progress);
          }
          lastOutput = data;
        });
      }
      
      process.on('close', (code) => {
        if (code === 0) {
          // Extract filename from last output
          const filename = this.extractFilename(lastOutput, outputTemplate);
          resolve(filename);
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseMetadata(raw: any): MediaMetadata {
    return {
      id: raw.id || raw.display_id,
      title: raw.title || 'Unknown Title',
      description: raw.description,
      duration: raw.duration,
      uploader: raw.uploader || raw.channel,
      upload_date: raw.upload_date,
      thumbnail: raw.thumbnail,
      webpage_url: raw.webpage_url,
      formats: (raw.formats || []).map((f: any) => ({
        id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        filesize: f.filesize,
        format_note: f.format_note,
        acodec: f.acodec,
        vcodec: f.vcodec,
      })),
    };
  }

  private filterFormats(formats: FormatInfo[]): FormatInfo[] {
    const maxSize = config.download.maxFileSize;
    
    return formats.filter(format => {
      // Filter out formats without file size info (we'll estimate later)
      if (format.filesize && format.filesize > maxSize) {
        return false;
      }
      return true;
    });
  }

  private buildFormatArg(format: string): string {
    switch (format) {
      case 'bestaudio':
        return 'bestaudio/best';
      case 'best':
        return 'bestvideo+bestaudio/best';
      case '360p':
        return 'bestvideo[height<=360]+bestaudio/best[height<=360]';
      case '480p':
        return 'bestvideo[height<=480]+bestaudio/best[height<=480]';
      case '720p':
        return 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      default:
        return format;
    }
  }

  private parseProgress(data: string): number | null {
    // Parse yt-dlp progress output
    const match = data.match(/(\d+\.?\d*)%/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  }

  private extractFilename(data: string, template: string): string {
    // Extract filename from yt-dlp output
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.includes('Destination:') || line.includes('Merging formats into')) {
        return line.split(':').pop()?.trim() || '';
      }
    }
    // Fallback: return first non-empty line
    const nonEmpty = lines.find(l => l.trim());
    return nonEmpty?.trim() || '';
  }
        }
