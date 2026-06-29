import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { config } from '../config';
import { createChildLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createChildLogger('r2-storage');

class R2Storage {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
    this.bucket = config.r2.bucketName;
  }

  async uploadFile(filePath: string, fileName?: string): Promise<string> {
    const key = fileName || `${uuidv4()}-${filePath.split('/').pop()}`;
    const fileStream = createReadStream(filePath);

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: fileStream,
        },
      });

      await upload.done();
      logger.info({ key }, 'File uploaded to R2');

      // Delete local file after successful upload
      await unlink(filePath).catch(err => 
        logger.warn({ error: err.message }, 'Failed to delete local file')
      );

      return key;
    } catch (error: any) {
      logger.error({ error: error.message, filePath }, 'Failed to upload to R2');
      throw error;
    }
  }

  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error: any) {
      logger.error({ error: error.message, key }, 'Failed to generate download URL');
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info({ key }, 'File deleted from R2');
    } catch (error: any) {
      logger.error({ error: error.message, key }, 'Failed to delete file from R2');
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}

export const r2Storage = new R2Storage();
