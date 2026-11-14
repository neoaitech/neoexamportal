import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { CreatePaperDto } from './dto/create-paper.dto.js';
import { SetSchemeDto } from './dto/set-scheme.dto.js';
import { PapersService } from './papers.service.js';

const MB = 1024 * 1024;

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EVALUATOR', 'CHIEF_EVALUATOR', 'TENANT_ADMIN')
@Controller('papers')
export class PapersController {
  constructor(private readonly papers: PapersService) {}

  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.papers.listMine(user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * MB } }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaperDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.papers.create(user, dto, file);
  }

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.papers.getDetail(id, user);
  }

  @Put(':id/scheme')
  setScheme(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetSchemeDto,
  ) {
    return this.papers.setScheme(id, user, dto);
  }

  @Post(':id/scripts')
  @UseInterceptors(FilesInterceptor('pages', 150, { limits: { fileSize: 15 * MB } }))
  createScript(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() pages: Express.Multer.File[] | undefined,
  ) {
    return this.papers.createScript(id, user, pages ?? []);
  }
}
