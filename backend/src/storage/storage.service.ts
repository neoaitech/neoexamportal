import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface FileTokenPayload {
  key: string;
  tenantId: string;
  purpose: 'file';
}

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Local-disk storage behind a key-based interface, so swapping in S3/MinIO
// later only touches this class. Keys are tenant-prefixed; downloads go
// through short-lived signed URLs (matching ScriptPage.imageUrl's contract).
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.root = resolve(this.config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads'));
  }

  extensionFor(mime: string): string | undefined {
    return EXT_BY_MIME[mime];
  }

  async save(tenantId: string, folder: string, mime: string, data: Buffer): Promise<string> {
    const ext = EXT_BY_MIME[mime];
    if (!ext) throw new Error(`Unsupported mime type ${mime}`);
    const key = `${tenantId}/${folder}/${randomUUID()}.${ext}`;
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return key;
  }

  // Best effort: a missing file must not block deleting the DB records.
  async remove(key: string): Promise<void> {
    if (key.startsWith('/') || key.startsWith('http')) return;
    await rm(this.pathFor(key), { force: true }).catch(() => undefined);
  }

  async read(key: string): Promise<Buffer> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  // Keys starting with "/" or "http" are pre-hosted assets (seed data under
  // the frontend's /public) and are passed through untouched.
  async signedUrl(key: string, tenantId: string): Promise<string> {
    if (key.startsWith('/') || key.startsWith('http')) return key;
    const token = await this.jwt.signAsync(
      { key, tenantId, purpose: 'file' } satisfies FileTokenPayload,
      { secret: this.fileSecret(), expiresIn: '2h' },
    );
    const base = this.config.get<string>('PUBLIC_API_URL') ?? `http://localhost:${this.config.get('PORT') ?? 3001}/api`;
    return `${base}/files/${token}`;
  }

  async resolveToken(token: string): Promise<{ key: string; mime: string }> {
    let payload: FileTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<FileTokenPayload>(token, { secret: this.fileSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired file link');
    }
    if (payload.purpose !== 'file' || !payload.key.startsWith(`${payload.tenantId}/`)) {
      throw new UnauthorizedException('Invalid file link');
    }
    const ext = payload.key.split('.').pop() ?? '';
    return { key: payload.key, mime: MIME_BY_EXT[ext] ?? 'application/octet-stream' };
  }

  private fileSecret(): string {
    return `${this.config.getOrThrow<string>('JWT_ACCESS_SECRET')}:file`;
  }

  private pathFor(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) throw new NotFoundException('File not found');
    return path;
  }
}
