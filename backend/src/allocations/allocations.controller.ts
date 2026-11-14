import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { AllocationsService } from './allocations.service.js';
import { CreateAnnotationDto } from './dto/create-annotation.dto.js';
import { SetMarkDto } from './dto/set-mark.dto.js';
import { SetPageBlankDto } from './dto/set-page-blank.dto.js';
import { SetPageReviewedDto } from './dto/set-page-reviewed.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.allocationsService.findMineForEvaluator(user.userId);
  }

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.allocationsService.getDetail(id, user);
  }

  @Delete(':id')
  deleteUploaded(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.allocationsService.deleteUploaded(id, user);
  }

  @Patch(':id/pages/:pageId')
  setPageBlank(
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Body() dto: SetPageBlankDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.setPageBlank(id, pageId, user, dto.isBlank);
  }

  @Patch(':id/pages/:pageId/review')
  setPageReviewed(
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Body() dto: SetPageReviewedDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.setPageReviewed(id, pageId, user, dto.isReviewed);
  }

  @Post(':id/pages/:pageId/annotations')
  addAnnotation(
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateAnnotationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.addAnnotation(id, pageId, user, dto);
  }

  @Delete(':id/annotations/:annotationId')
  deleteAnnotation(
    @Param('id') id: string,
    @Param('annotationId') annotationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.deleteAnnotation(id, annotationId, user);
  }

  @Patch(':id/marks/:rubricStepId')
  setMark(
    @Param('id') id: string,
    @Param('rubricStepId') rubricStepId: string,
    @Body() dto: SetMarkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.setMark(id, rubricStepId, user, dto);
  }

  @Post(':id/questions/:questionId/choose-alternative')
  chooseAlternative(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.allocationsService.chooseAlternative(id, questionId, user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.allocationsService.submit(id, user);
  }
}
