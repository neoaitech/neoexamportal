import type {
  Annotation,
  NewAnnotation,
  SchemeQuestionInput,
  WorkspacePage,
  WorkspaceQuestion,
  WorkspaceQuestionPaper,
} from "./evaluation-types";
import type { AllocationStatus, AttemptStatus, Role } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface LoginResponse {
  mfaRequired: boolean;
  mfaToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
}

export interface AllocationSummaryResponse {
  id: string;
  scriptCode: string;
  examName: string;
  status: AllocationStatus;
  assignedAt: string;
}

export interface AllocationDetailResponse {
  id: string;
  status: AllocationStatus;
  scriptCode: string;
  examName: string;
  questionPaper: WorkspaceQuestionPaper | null;
  pages: WorkspacePage[];
  questions: WorkspaceQuestion[];
  marks: Record<string, { attemptStatus: AttemptStatus; marksAwarded: number | null }>;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Unable to reach the server. Is the backend running?");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Something went wrong");
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyOtp: (mfaToken: string, code: string) =>
    request<SessionTokens>("/auth/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mfaToken, code }),
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: (accessToken: string) => request<MeResponse>("/auth/me", {}, accessToken),

  getMyAllocations: (accessToken: string) =>
    request<AllocationSummaryResponse[]>("/allocations/mine", {}, accessToken),

  getAllocationDetail: (accessToken: string, allocationId: string) =>
    request<AllocationDetailResponse>(`/allocations/${allocationId}`, {}, accessToken),

  deleteAllocation: (accessToken: string, allocationId: string) =>
    request<{ id: string }>(`/allocations/${allocationId}`, { method: "DELETE" }, accessToken),

  setPageBlank: (accessToken: string, allocationId: string, pageId: string, isBlank: boolean) =>
    request<{ id: string; isBlank: boolean }>(
      `/allocations/${allocationId}/pages/${pageId}`,
      { method: "PATCH", body: JSON.stringify({ isBlank }) },
      accessToken,
    ),

  setPageReviewed: (
    accessToken: string,
    allocationId: string,
    pageId: string,
    isReviewed: boolean,
  ) =>
    request<{ id: string; isReviewed: boolean }>(
      `/allocations/${allocationId}/pages/${pageId}/review`,
      { method: "PATCH", body: JSON.stringify({ isReviewed }) },
      accessToken,
    ),

  addAnnotation: (
    accessToken: string,
    allocationId: string,
    pageId: string,
    annotation: NewAnnotation,
  ) =>
    request<Annotation>(
      `/allocations/${allocationId}/pages/${pageId}/annotations`,
      { method: "POST", body: JSON.stringify(annotation) },
      accessToken,
    ),

  deleteAnnotation: (accessToken: string, allocationId: string, annotationId: string) =>
    request<{ id: string }>(
      `/allocations/${allocationId}/annotations/${annotationId}`,
      { method: "DELETE" },
      accessToken,
    ),

  setMark: (
    accessToken: string,
    allocationId: string,
    rubricStepId: string,
    attemptStatus: AttemptStatus,
    marksAwarded: number | null,
  ) =>
    request<{ rubricStepId: string; attemptStatus: AttemptStatus; marksAwarded: number | null }>(
      `/allocations/${allocationId}/marks/${rubricStepId}`,
      { method: "PATCH", body: JSON.stringify({ attemptStatus, marksAwarded }) },
      accessToken,
    ),

  chooseAlternative: (accessToken: string, allocationId: string, questionId: string) =>
    request<{ optionGroup: string; chosenQuestionId: string }>(
      `/allocations/${allocationId}/questions/${questionId}/choose-alternative`,
      { method: "POST" },
      accessToken,
    ),

  submitAllocation: (accessToken: string, allocationId: string) =>
    request<{ id: string; status: AllocationStatus; totalMarksAwarded: number }>(
      `/allocations/${allocationId}/submit`,
      { method: "POST" },
      accessToken,
    ),
};

export interface PaperSummaryResponse {
  id: string;
  examName: string;
  subjectCode: string;
  questionCount: number;
  totalMarks: number;
  createdAt: string;
}

export interface PaperDetailResponse {
  id: string;
  examName: string;
  subjectCode: string;
  academicYear: string;
  totalMarks: number;
  fileName: string | null;
  fileMime: string | null;
  fileUrl: string | null;
  questions: SchemeQuestionInput[];
}

export const papersApi = {
  list: (accessToken: string) => request<PaperSummaryResponse[]>("/papers/mine", {}, accessToken),

  get: (accessToken: string, paperId: string) =>
    request<PaperDetailResponse>(`/papers/${paperId}`, {}, accessToken),

  create: (accessToken: string, form: FormData) =>
    request<{ id: string }>("/papers", { method: "POST", body: form }, accessToken),

  setScheme: (accessToken: string, paperId: string, questions: SchemeQuestionInput[]) =>
    request<{ id: string; totalMarks: number }>(
      `/papers/${paperId}/scheme`,
      { method: "PUT", body: JSON.stringify({ questions }) },
      accessToken,
    ),

  uploadScript: (accessToken: string, paperId: string, form: FormData) =>
    request<{ allocationId: string; scriptCode: string }>(
      `/papers/${paperId}/scripts`,
      { method: "POST", body: form },
      accessToken,
    ),
};
