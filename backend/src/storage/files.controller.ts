import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service.js';

// Authorization is the signed token itself (issued only to users who passed
// the tenant/ownership checks when the page/paper detail was fetched), so
// <img>/<iframe> can load it without a bearer header.
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  async get(@Param('token') token: string, @Res() res: Response) {
    const { key, mime } = await this.storage.resolveToken(token);
    const data = await this.storage.read(key);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(data);
  }
}
