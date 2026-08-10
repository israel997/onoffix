import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/** Upload de fichiers vers un stockage objet S3-compatible (DigitalOcean Spaces). */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('SPACES_BUCKET', '');
    this.publicUrl = config.get<string>('SPACES_PUBLIC_URL', '');
    this.client = new S3Client({
      endpoint: config.get<string>('SPACES_ENDPOINT'),
      region: config.get<string>('SPACES_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get<string>('SPACES_KEY', ''),
        secretAccessKey: config.get<string>('SPACES_SECRET', ''),
      },
    });
  }

  async upload(
    buffer: Buffer,
    folder: string,
    filename: string,
    contentType: string,
  ): Promise<string> {
    const key = `${folder}/${randomUUID()}-${filename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
    return `${this.publicUrl}/${key}`;
  }
}
