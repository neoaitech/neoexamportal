import type { AttemptStatus } from "./types";

export type AnnotationTool = "select" | "tick" | "cross" | "note";

interface AnnotationBase {
  id: string;
  x: number;
  y: number;
}

export interface TickAnnotation extends AnnotationBase {
  type: "TICK";
}

export interface CrossAnnotation extends AnnotationBase {
  type: "CROSS";
}

export interface NoteAnnotation extends AnnotationBase {
  type: "NOTE";
  text: string;
}

export type Annotation = TickAnnotation | CrossAnnotation | NoteAnnotation;

// `Omit` doesn't distribute over a union -- it collapses to the members'
// common keys first, which silently drops NoteAnnotation's `text` field.
// This distributes the Omit across each branch before re-unioning.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type NewAnnotation = DistributiveOmit<Annotation, "id">;

export interface WorkspacePage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  isBlank: boolean;
  isReviewed: boolean;
  annotations: Annotation[];
}

// Mirrors RubricStep in packages/db/prisma/schema.prisma.
export interface WorkspaceRubricStep {
  id: string;
  stepNumber: number;
  description: string;
  maxMarks: number;
}

// Mirrors Question in packages/db/prisma/schema.prisma. Sub-questions sharing
// a parentId + optionGroup are OR-alternatives (attempt one, not the other).
export interface WorkspaceQuestion {
  id: string;
  questionNumber: string;
  maxMarks: number;
  parentId: string | null;
  optionGroup: string | null;
  steps: WorkspaceRubricStep[];
}

export interface StepMark {
  attemptStatus: AttemptStatus | null; // null = not yet marked at all
  marksAwarded: number | null;
}

// The evaluator-uploaded question paper for the script being evaluated.
export interface WorkspaceQuestionPaper {
  title: string;
  totalMarks: number;
  fileName: string | null;
  fileMime: string | null;
  fileUrl: string | null;
}

// Marking scheme as edited in the upload wizard (no ids yet).
export interface SchemeStepInput {
  description: string;
  maxMarks: number;
}

export interface SchemeQuestionInput {
  questionNumber: string;
  maxMarks: number;
  optionGroup: string | null;
  steps: SchemeStepInput[];
}
