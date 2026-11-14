import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreateAnnotationDto } from './dto/create-annotation.dto.js';
import type { SetMarkDto } from './dto/set-mark.dto.js';

interface AnnotationData {
  [key: string]: unknown;
  x: number;
  y: number;
  text?: string;
}

@Injectable()
export class AllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findMineForEvaluator(userId: string) {
    const allocations = await this.prisma.allocation.findMany({
      where: { evaluatorId: userId, type: 'PRIMARY' },
      include: { answerScript: { include: { exam: true } } },
      orderBy: { assignedAt: 'desc' },
    });

    return allocations.map((a) => ({
      id: a.id,
      scriptCode: a.answerScript.scriptCode,
      examName: a.answerScript.exam.name,
      status: a.status,
      assignedAt: a.assignedAt,
    }));
  }

  // Lets an evaluator remove a script they uploaded themselves (e.g. a wrong
  // upload) before it is submitted. Admin-allocated scripts and anything
  // submitted/locked are off limits.
  async deleteUploaded(allocationId: string, user: AuthenticatedUser) {
    const allocation = await this.getMutableOwnedAllocation(allocationId, user);
    const script = await this.prisma.answerScript.findUnique({
      where: { id: allocation.answerScriptId },
      include: { pages: true, allocations: { select: { id: true } } },
    });
    if (!script) throw new NotFoundException('Allocation not found');

    const uploadedByUser = await this.prisma.questionPaper.count({
      where: { examId: script.examId, createdById: user.userId },
    });
    if (uploadedByUser === 0 || script.allocations.length > 1) {
      throw new ForbiddenException('Only scripts you uploaded yourself can be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.annotation.deleteMany({ where: { allocationId } });
      await tx.mark.deleteMany({ where: { allocationId } });
      await tx.auditLog.deleteMany({ where: { allocationId } });
      await tx.allocation.delete({ where: { id: allocationId } });
      await tx.studentScriptMap.deleteMany({ where: { answerScriptId: script.id } });
      await tx.scriptPage.deleteMany({ where: { answerScriptId: script.id } });
      await tx.answerScript.delete({ where: { id: script.id } });
    });
    await Promise.all(script.pages.map((p) => this.storage.remove(p.imageUrl)));
    return { id: allocationId };
  }

  async getDetail(allocationId: string, user: AuthenticatedUser) {
    const allocation = await this.prisma.allocation.findUnique({
      where: { id: allocationId },
      include: {
        answerScript: {
          include: {
            exam: {
              include: {
                questionPapers: {
                  include: {
                    questions: {
                      include: { steps: { orderBy: { stepNumber: 'asc' } } },
                      orderBy: [{ sortOrder: 'asc' }, { questionNumber: 'asc' }],
                    },
                  },
                },
              },
            },
            pages: {
              include: { annotations: { orderBy: { createdAt: 'asc' } } },
              orderBy: { pageNumber: 'asc' },
            },
          },
        },
        marks: true,
      },
    });

    // 404, not 403 -- don't reveal that an allocation exists in another
    // tenant or is assigned to someone else.
    if (!allocation || allocation.tenantId !== user.tenantId || allocation.evaluatorId !== user.userId) {
      throw new NotFoundException('Allocation not found');
    }

    const questionPaper = allocation.answerScript.exam.questionPapers[0];
    const questions = (questionPaper?.questions ?? []).map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      maxMarks: Number(q.maxMarks),
      parentId: q.parentQuestionId,
      optionGroup: q.optionGroup,
      steps: q.steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        description: s.description,
        maxMarks: Number(s.maxMarks),
      })),
    }));

    const signedPageUrls = await Promise.all(
      allocation.answerScript.pages.map((p) => this.storage.signedUrl(p.imageUrl, user.tenantId)),
    );
    const pages = allocation.answerScript.pages.map((p, i) => ({
      id: p.id,
      pageNumber: p.pageNumber,
      imageUrl: signedPageUrls[i],
      imageWidth: p.imageWidth,
      imageHeight: p.imageHeight,
      isBlank: p.isBlank,
      isReviewed: p.isReviewed,
      annotations: p.annotations.map((a) => {
        const data = a.data as unknown as AnnotationData;
        return {
          id: a.id,
          type: a.type,
          x: data.x,
          y: data.y,
          ...(a.type === 'NOTE' ? { text: data.text ?? '' } : {}),
        };
      }),
    }));

    const marks: Record<
      string,
      { attemptStatus: AttemptStatus; marksAwarded: number | null }
    > = {};
    for (const m of allocation.marks) {
      marks[m.rubricStepId] = {
        attemptStatus: m.attemptStatus,
        marksAwarded: m.marksAwarded === null ? null : Number(m.marksAwarded),
      };
    }

    return {
      id: allocation.id,
      status: allocation.status,
      scriptCode: allocation.answerScript.scriptCode,
      examName: allocation.answerScript.exam.name,
      questionPaper: questionPaper
        ? {
            title: questionPaper.title,
            totalMarks: Number(questionPaper.totalMarks),
            fileName: questionPaper.fileName,
            fileMime: questionPaper.fileMime,
            fileUrl: questionPaper.fileKey
              ? await this.storage.signedUrl(questionPaper.fileKey, user.tenantId)
              : null,
          }
        : null,
      pages,
      questions,
      marks,
    };
  }

  async setPageBlank(
    allocationId: string,
    pageId: string,
    user: AuthenticatedUser,
    isBlank: boolean,
  ) {
    const allocation = await this.getMutableOwnedAllocation(allocationId, user);
    const page = await this.prisma.scriptPage.findUnique({ where: { id: pageId } });
    if (!page || page.tenantId !== user.tenantId || page.answerScriptId !== allocation.answerScriptId) {
      throw new NotFoundException('Page not found');
    }
    await this.prisma.scriptPage.update({ where: { id: pageId }, data: { isBlank } });
    return { id: pageId, isBlank };
  }

  async setPageReviewed(
    allocationId: string,
    pageId: string,
    user: AuthenticatedUser,
    isReviewed: boolean,
  ) {
    const allocation = await this.getMutableOwnedAllocation(allocationId, user);
    const page = await this.prisma.scriptPage.findUnique({ where: { id: pageId } });
    if (!page || page.tenantId !== user.tenantId || page.answerScriptId !== allocation.answerScriptId) {
      throw new NotFoundException('Page not found');
    }
    await this.prisma.scriptPage.update({ where: { id: pageId }, data: { isReviewed } });
    return { id: pageId, isReviewed };
  }

  async addAnnotation(
    allocationId: string,
    pageId: string,
    user: AuthenticatedUser,
    dto: CreateAnnotationDto,
  ) {
    const allocation = await this.getMutableOwnedAllocation(allocationId, user);
    const page = await this.prisma.scriptPage.findUnique({ where: { id: pageId } });
    if (!page || page.tenantId !== user.tenantId || page.answerScriptId !== allocation.answerScriptId) {
      throw new NotFoundException('Page not found');
    }

    const data: AnnotationData =
      dto.type === 'NOTE' ? { x: dto.x, y: dto.y, text: dto.text ?? '' } : { x: dto.x, y: dto.y };

    const annotation = await this.prisma.annotation.create({
      data: {
        tenantId: user.tenantId,
        scriptPageId: pageId,
        allocationId,
        createdById: user.userId,
        type: dto.type,
        data: data as Prisma.InputJsonValue,
      },
    });

    return {
      id: annotation.id,
      type: annotation.type,
      x: data.x,
      y: data.y,
      ...(annotation.type === 'NOTE' ? { text: data.text ?? '' } : {}),
    };
  }

  async deleteAnnotation(
    allocationId: string,
    annotationId: string,
    user: AuthenticatedUser,
  ) {
    await this.getMutableOwnedAllocation(allocationId, user);
    const annotation = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
    });
    if (
      !annotation ||
      annotation.tenantId !== user.tenantId ||
      annotation.allocationId !== allocationId
    ) {
      throw new NotFoundException('Annotation not found');
    }
    await this.prisma.annotation.delete({ where: { id: annotationId } });
    return { id: annotationId };
  }

  async setMark(
    allocationId: string,
    rubricStepId: string,
    user: AuthenticatedUser,
    dto: SetMarkDto,
  ) {
    await this.getMutableOwnedAllocation(allocationId, user);
    const step = await this.prisma.rubricStep.findUnique({
      where: { id: rubricStepId },
    });
    if (!step || step.tenantId !== user.tenantId) {
      throw new NotFoundException('Rubric step not found');
    }

    const marksAwarded = dto.attemptStatus === 'ATTEMPTED' ? (dto.marksAwarded ?? null) : null;

    await this.prisma.mark.upsert({
      where: { allocationId_rubricStepId: { allocationId, rubricStepId } },
      update: { attemptStatus: dto.attemptStatus, marksAwarded },
      create: {
        tenantId: user.tenantId,
        allocationId,
        rubricStepId,
        attemptStatus: dto.attemptStatus,
        marksAwarded,
      },
    });

    return { rubricStepId, attemptStatus: dto.attemptStatus, marksAwarded };
  }

  async chooseAlternative(
    allocationId: string,
    questionId: string,
    user: AuthenticatedUser,
  ) {
    await this.getMutableOwnedAllocation(allocationId, user);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { steps: true },
    });
    if (!question || question.tenantId !== user.tenantId || !question.optionGroup) {
      throw new BadRequestException('Not a valid alternative question');
    }

    const siblings = await this.prisma.question.findMany({
      where: {
        questionPaperId: question.questionPaperId,
        optionGroup: question.optionGroup,
      },
      include: { steps: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const sibling of siblings) {
        const isChosen = sibling.id === questionId;
        for (const step of sibling.steps) {
          if (isChosen) {
            // Clear any stale NOT_APPLICABLE from a previous choice so the
            // evaluator marks this side fresh.
            await tx.mark.deleteMany({
              where: { allocationId, rubricStepId: step.id, attemptStatus: 'NOT_APPLICABLE' },
            });
          } else {
            await tx.mark.upsert({
              where: { allocationId_rubricStepId: { allocationId, rubricStepId: step.id } },
              update: { attemptStatus: 'NOT_APPLICABLE', marksAwarded: null },
              create: {
                tenantId: user.tenantId,
                allocationId,
                rubricStepId: step.id,
                attemptStatus: 'NOT_APPLICABLE',
                marksAwarded: null,
              },
            });
          }
        }
      }
    });

    return { optionGroup: question.optionGroup, chosenQuestionId: questionId };
  }

  async submit(allocationId: string, user: AuthenticatedUser) {
    const allocation = await this.getMutableOwnedAllocation(allocationId, user);

    const answerScript = await this.prisma.answerScript.findUniqueOrThrow({
      where: { id: allocation.answerScriptId },
      select: { examId: true },
    });
    const questionPaper = await this.prisma.questionPaper.findFirst({
      where: { examId: answerScript.examId },
      select: { id: true },
    });

    const [steps, pages, marks] = await Promise.all([
      questionPaper
        ? this.prisma.rubricStep.findMany({
            where: { question: { questionPaperId: questionPaper.id } },
            select: { id: true },
          })
        : Promise.resolve([]),
      this.prisma.scriptPage.findMany({
        where: { answerScriptId: allocation.answerScriptId },
        select: {
          id: true,
          isBlank: true,
          isReviewed: true,
          _count: { select: { annotations: true } },
        },
      }),
      this.prisma.mark.findMany({ where: { allocationId } }),
    ]);

    const markedStepIds = new Set(marks.map((m) => m.rubricStepId));
    const unresolvedSteps = steps.filter((s) => !markedStepIds.has(s.id)).length;
    const unreviewedPages = pages.filter(
      (p) => !p.isBlank && !p.isReviewed && p._count.annotations === 0,
    ).length;

    if (unresolvedSteps > 0 || unreviewedPages > 0) {
      throw new BadRequestException({
        message: 'Evaluation is incomplete',
        unresolvedSteps,
        unreviewedPages,
      });
    }

    const totalMarksAwarded = marks
      .filter((m) => m.attemptStatus === 'ATTEMPTED')
      .reduce((sum, m) => sum + (m.marksAwarded ? Number(m.marksAwarded) : 0), 0);

    const [updatedAllocation] = await this.prisma.$transaction([
      this.prisma.allocation.update({
        where: { id: allocationId },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      }),
      this.prisma.answerScript.update({
        where: { id: allocation.answerScriptId },
        data: { status: 'EVALUATED', totalMarksAwarded },
      }),
    ]);

    return { id: updatedAllocation.id, status: updatedAllocation.status, totalMarksAwarded };
  }

  private async getMutableOwnedAllocation(allocationId: string, user: AuthenticatedUser) {
    const allocation = await this.prisma.allocation.findUnique({ where: { id: allocationId } });
    if (!allocation || allocation.tenantId !== user.tenantId || allocation.evaluatorId !== user.userId) {
      throw new NotFoundException('Allocation not found');
    }
    if (allocation.status === 'SUBMITTED' || allocation.status === 'LOCKED') {
      throw new ForbiddenException('This evaluation has already been submitted');
    }
    return allocation;
  }
}
