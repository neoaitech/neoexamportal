import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import type {
  AnnotationTool,
  NewAnnotation,
  StepMark,
  WorkspacePage,
  WorkspaceQuestion,
  WorkspaceQuestionPaper,
} from "@/lib/evaluation-types";
import { inferSelectedOrOption } from "@/lib/evaluation-selectors";
import type { AllocationStatus, AttemptStatus } from "@/lib/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface SubmitResult {
  ok: boolean;
  message?: string;
  unresolvedSteps?: number;
  unreviewedPages?: number;
}

interface EvaluationState {
  allocationId: string | null;
  accessToken: string | null;
  status: LoadStatus;
  error: string | null;
  allocationStatus: AllocationStatus | null;
  scriptCode: string | null;
  examName: string | null;
  questionPaper: WorkspaceQuestionPaper | null;
  pages: WorkspacePage[];
  questions: WorkspaceQuestion[];
  currentPageIndex: number;
  marks: Record<string, StepMark>;
  selectedOrOption: Record<string, string>;
  tool: AnnotationTool;
  selectedAnnotationId: string | null;

  initialize: (allocationId: string, accessToken: string) => Promise<void>;
  clearError: () => void;
  goToPage: (index: number) => void;
  setTool: (tool: AnnotationTool) => void;
  addAnnotation: (pageId: string, annotation: NewAnnotation) => Promise<void>;
  deleteAnnotation: (pageId: string, annotationId: string) => Promise<void>;
  selectAnnotation: (id: string | null) => void;
  setPageBlank: (pageId: string, isBlank: boolean) => Promise<void>;
  setPageReviewed: (pageId: string, isReviewed: boolean) => Promise<void>;
  setStepMark: (
    stepId: string,
    attemptStatus: AttemptStatus,
    marksAwarded: number | null,
  ) => Promise<void>;
  chooseOrOption: (optionGroup: string, questionId: string) => Promise<void>;
  submit: () => Promise<SubmitResult>;
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong";
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  allocationId: null,
  accessToken: null,
  status: "idle",
  error: null,
  allocationStatus: null,
  scriptCode: null,
  examName: null,
  questionPaper: null,
  pages: [],
  questions: [],
  currentPageIndex: 0,
  marks: {},
  selectedOrOption: {},
  tool: "select",
  selectedAnnotationId: null,

  initialize: async (allocationId, accessToken) => {
    set({
      allocationId,
      accessToken,
      status: "loading",
      error: null,
      currentPageIndex: 0,
      tool: "select",
      selectedAnnotationId: null,
    });
    try {
      const detail = await api.getAllocationDetail(accessToken, allocationId);
      set({
        status: "ready",
        allocationStatus: detail.status,
        scriptCode: detail.scriptCode,
        examName: detail.examName,
        questionPaper: detail.questionPaper,
        pages: detail.pages,
        questions: detail.questions,
        marks: detail.marks,
        selectedOrOption: inferSelectedOrOption(detail.questions, detail.marks),
      });
    } catch (err) {
      set({ status: "error", error: errorMessage(err) });
    }
  },

  clearError: () => set({ error: null }),

  goToPage: (index) => {
    const { pages } = get();
    if (index < 0 || index >= pages.length) return;
    set({ currentPageIndex: index, selectedAnnotationId: null });
  },

  setTool: (tool) => set({ tool, selectedAnnotationId: null }),

  addAnnotation: async (pageId, annotation) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      const created = await api.addAnnotation(accessToken, allocationId, pageId, annotation);
      set((state) => ({
        pages: state.pages.map((page) =>
          page.id === pageId ? { ...page, annotations: [...page.annotations, created] } : page,
        ),
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  deleteAnnotation: async (pageId, annotationId) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      await api.deleteAnnotation(accessToken, allocationId, annotationId);
      set((state) => ({
        pages: state.pages.map((page) =>
          page.id === pageId
            ? { ...page, annotations: page.annotations.filter((a) => a.id !== annotationId) }
            : page,
        ),
        selectedAnnotationId: null,
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  setPageBlank: async (pageId, isBlank) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      await api.setPageBlank(accessToken, allocationId, pageId, isBlank);
      set((state) => ({
        pages: state.pages.map((page) => (page.id === pageId ? { ...page, isBlank } : page)),
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  setPageReviewed: async (pageId, isReviewed) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      await api.setPageReviewed(accessToken, allocationId, pageId, isReviewed);
      set((state) => ({
        pages: state.pages.map((page) => (page.id === pageId ? { ...page, isReviewed } : page)),
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  setStepMark: async (stepId, attemptStatus, marksAwarded) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      const result = await api.setMark(accessToken, allocationId, stepId, attemptStatus, marksAwarded);
      set((state) => ({
        marks: {
          ...state.marks,
          [stepId]: { attemptStatus: result.attemptStatus, marksAwarded: result.marksAwarded },
        },
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  chooseOrOption: async (optionGroup, questionId) => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return;
    try {
      await api.chooseAlternative(accessToken, allocationId, questionId);
      // Re-fetch rather than replicate the sibling-marking logic client-side
      // -- keeps the server the single source of truth for what got marked.
      const detail = await api.getAllocationDetail(accessToken, allocationId);
      set((state) => ({
        pages: detail.pages,
        questions: detail.questions,
        marks: detail.marks,
        selectedOrOption: { ...state.selectedOrOption, [optionGroup]: questionId },
      }));
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  submit: async () => {
    const { allocationId, accessToken } = get();
    if (!allocationId || !accessToken) return { ok: false, message: "Not ready" };
    try {
      const result = await api.submitAllocation(accessToken, allocationId);
      set({ allocationStatus: result.status });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body = err.body as { unresolvedSteps?: number; unreviewedPages?: number } | undefined;
        return {
          ok: false,
          message: err.message,
          unresolvedSteps: body?.unresolvedSteps,
          unreviewedPages: body?.unreviewedPages,
        };
      }
      return { ok: false, message: errorMessage(err) };
    }
  },
}));
