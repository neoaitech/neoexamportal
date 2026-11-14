import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { imageSize } from 'image-size';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { StorageService } from '../storage/storage.service.js';
import type { CreatePaperDto } from './dto/create-paper.dto.js';
import type { SetSchemeDto } from './dto/set-scheme.dto.js';

export const PAPER_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const PAGE_MIMES = ['image/png', 'image/jpeg'];

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class PapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreatePaperDto, file: UploadedFile | undefined) {
    if (!file) throw new BadRequestException('Question paper file is required');
    if (!PAPER_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Question paper must be a PDF, DOCX, PNG or JPEG file');
    }
    const fileKey = await this.storage.save(user.tenantId, 'papers', file.mimetype, file.buffer);

    const paper = await this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          tenantId: user.tenantId,
          name: dto.examName,
          subjectCode: dto.subjectCode,
          academicYear: dto.academicYear,
        },
      });
      return tx.questionPaper.create({
        data: {
          tenantId: user.tenantId,
          examId: exam.id,
          title: dto.examName,
          totalMarks: 0,
          fileKey,
          fileName: file.originalname,
          fileMime: file.mimetype,
          createdById: user.userId,
        },
      });
    });
    return { id: paper.id };
  }

  async listMine(user: AuthenticatedUser) {
    const papers = await this.prisma.questionPaper.findMany({
      where: { tenantId: user.tenantId, createdById: user.userId },
      include: { exam: true, _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return papers.map((p) => ({
      id: p.id,
      examName: p.exam.name,
      subjectCode: p.exam.subjectCode,
      questionCount: p._count.questions,
      totalMarks: Number(p.totalMarks),
      createdAt: p.createdAt,
    }));
  }

  async getDetail(paperId: string, user: AuthenticatedUser) {
    const paper = await this.getOwnedPaper(paperId, user);
    const questions = await this.prisma.question.findMany({
      where: { questionPaperId: paperId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      id: paper.id,
      examName: paper.exam.name,
      subjectCode: paper.exam.subjectCode,
      academicYear: paper.exam.academicYear,
      totalMarks: Number(paper.totalMarks),
      fileName: paper.fileName,
      fileMime: paper.fileMime,
      fileUrl: paper.fileKey ? await this.storage.signedUrl(paper.fileKey, user.tenantId) : null,
      questions: questions.map((q) => ({
        questionNumber: q.questionNumber,
        maxMarks: Number(q.maxMarks),
        optionGroup: q.optionGroup,
        steps: q.steps.map((s) => ({ description: s.description, maxMarks: Number(s.maxMarks) })),
      })),
    };
  }

  // Replaces the whole scheme. Refused once any marks exist so evaluation
  // history can't be orphaned by an edit.
  async setScheme(paperId: string, user: AuthenticatedUser, dto: SetSchemeDto) {
    const paper = await this.getOwnedPaper(paperId, user);
    const numbers = dto.questions.map((q) => q.questionNumber.trim());
    if (new Set(numbers).size !== numbers.length) {
      throw new BadRequestException('Question numbers must be unique');
    }
    for (const q of dto.questions) {
      const steps = q.steps?.length
        ? q.steps
        : [{ description: 'Whole question', maxMarks: q.maxMarks }];
      const sum = steps.reduce((acc, s) => acc + s.maxMarks, 0);
      if (Math.abs(sum - q.maxMarks) > 0.001) {
        throw new BadRequestException(
          `${q.questionNumber}: step marks (${sum}) must add up to the question's marks (${q.maxMarks})`,
        );
      }
    }

    const hasMarks = await this.prisma.mark.count({
      where: { rubricStep: { question: { questionPaperId: paperId } } },
    });
    if (hasMarks > 0) {
      throw new ConflictException('Marking has already started; the scheme can no longer be changed');
    }

    // Alternatives in an option group count once towards the paper total.
    const groupMax = new Map<string, number>();
    let total = 0;
    for (const q of dto.questions) {
      if (q.optionGroup) {
        groupMax.set(q.optionGroup, Math.max(groupMax.get(q.optionGroup) ?? 0, q.maxMarks));
      } else {
        total += q.maxMarks;
      }
    }
    for (const m of groupMax.values()) total += m;

    await this.prisma.$transaction(async (tx) => {
      await tx.rubricStep.deleteMany({ where: { question: { questionPaperId: paperId } } });
      await tx.question.deleteMany({ where: { questionPaperId: paperId } });
      for (const [index, q] of dto.questions.entries()) {
        const steps = q.steps?.length
          ? q.steps
          : [{ description: 'Whole question', maxMarks: q.maxMarks }];
        await tx.question.create({
          data: {
            tenantId: user.tenantId,
            questionPaperId: paperId,
            questionNumber: q.questionNumber.trim(),
            sortOrder: index,
            maxMarks: q.maxMarks,
            optionGroup: q.optionGroup || null,
            steps: {
              create: steps.map((s, i) => ({
                tenantId: user.tenantId,
                stepNumber: i + 1,
                description: s.description,
                maxMarks: s.maxMarks,
              })),
            },
          },
        });
      }
      await tx.questionPaper.update({ where: { id: paper.id }, data: { totalMarks: total } });
    });
    return { id: paper.id, totalMarks: total };
  }

  // Creates the anonymised script + pages and a PRIMARY allocation to the
  // uploader. Pages arrive already rasterised (the browser converts PDFs).
  async createScript(paperId: string, user: AuthenticatedUser, files: UploadedFile[]) {
    const paper = await this.getOwnedPaper(paperId, user);
    if (files.length === 0) throw new BadRequestException('Upload at least one page');
    const questionCount = await this.prisma.question.count({ where: { questionPaperId: paperId } });
    if (questionCount === 0) {
      throw new BadRequestException('Define the marking scheme before uploading answer sheets');
    }

    const stored: { key: string; width: number; height: number }[] = [];
    for (const f of files) {
      if (!PAGE_MIMES.includes(f.mimetype)) {
        throw new BadRequestException(`${f.originalname}: pages must be PNG or JPEG images`);
      }
      let size;
      try {
        size = imageSize(f.buffer);
      } catch {
        throw new BadRequestException(`${f.originalname}: not a readable image`);
      }
      if (!size.width || !size.height) {
        throw new BadRequestException(`${f.originalname}: not a readable image`);
      }
      const key = await this.storage.save(user.tenantId, 'scripts', f.mimetype, f.buffer);
      stored.push({ key, width: size.width, height: size.height });
    }

    // Random, non-sequential code: never derived from a student identity.
    const scriptCode = `SC-${randomInt(10000, 100000)}-${randomInt(100, 1000)}`;
    const allocation = await this.prisma.$transaction(async (tx) => {
      const script = await tx.answerScript.create({
        data: {
          tenantId: user.tenantId,
          examId: paper.examId,
          scriptCode,
          status: 'ALLOCATED',
          totalPages: stored.length,
          pages: {
            create: stored.map((p, i) => ({
              tenantId: user.tenantId,
              pageNumber: i + 1,
              imageUrl: p.key,
              imageWidth: p.width,
              imageHeight: p.height,
            })),
          },
        },
      });
      return tx.allocation.create({
        data: {
          tenantId: user.tenantId,
          answerScriptId: script.id,
          evaluatorId: user.userId,
          type: 'PRIMARY',
        },
      });
    });
    return { allocationId: allocation.id, scriptCode };
  }

  async getOwnedPaper(paperId: string, user: AuthenticatedUser) {
    const paper = await this.prisma.questionPaper.findUnique({
      where: { id: paperId },
      include: { exam: true },
    });
    // 404 rather than 403: don't reveal papers belonging to others.
    if (!paper || paper.tenantId !== user.tenantId || paper.createdById !== user.userId) {
      throw new NotFoundException('Question paper not found');
    }
    return paper;
  }
}
