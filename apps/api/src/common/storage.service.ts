import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Response } from 'express';

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

  /**
   * Relaie un fichier du bucket avec Content-Disposition: attachment, pour forcer
   * un vrai téléchargement même quand le bucket n'a pas de CORS pour le domaine front.
   */
  async pipeDownload(fileUrl: string, filename: string, res: Response) {
    if (!this.publicUrl || !fileUrl.startsWith(this.publicUrl)) {
      throw new ForbiddenException('URL non autorisée');
    }

    const upstream = await fetch(fileUrl);
    if (!upstream.ok || !upstream.body) {
      throw new NotFoundException('Fichier introuvable');
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/octet-stream',
    );
    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
  }
}
