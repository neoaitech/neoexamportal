import type { StepMark, WorkspacePage, WorkspaceQuestion } from "./evaluation-types";

export function getQuestionTotal(
  question: WorkspaceQuestion,
  marks: Record<string, StepMark>,
): number {
  return question.steps.reduce((sum, step) => {
    const mark = marks[step.id];
    if (mark?.attemptStatus === "ATTEMPTED") {
      return sum + (mark.marksAwarded ?? 0);
    }
    return sum;
  }, 0);
}

export function getGrandTotal(
  questions: WorkspaceQuestion[],
  marks: Record<string, StepMark>,
): { awarded: number; max: number } {
  // Alternative (OR) questions only count once toward the max -- use the
  // first question in each optionGroup for the max, plus every standalone
  // question.
  const seenGroups = new Set<string>();
  let max = 0;
  for (const q of questions) {
    if (q.optionGroup) {
      if (seenGroups.has(q.optionGroup)) continue;
      seenGroups.add(q.optionGroup);
    }
    max += q.maxMarks;
  }

  const awarded = questions.reduce(
    (sum, q) => sum + getQuestionTotal(q, marks),
    0,
  );

  return { awarded, max };
}

export interface ValidationIssue {
  questionNumber: string;
  stepDescription: string;
}

export function getValidationIssues(
  questions: WorkspaceQuestion[],
  marks: Record<string, StepMark>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const question of questions) {
    for (const step of question.steps) {
      const mark = marks[step.id];
      if (!mark || mark.attemptStatus === null) {
        issues.push({
          questionNumber: question.questionNumber,
          stepDescription: step.description,
        });
      }
    }
  }
  return issues;
}

export function getUnreviewedPages(pages: WorkspacePage[]): WorkspacePage[] {
  return pages.filter((p) => !p.isBlank && !p.isReviewed && p.annotations.length === 0);
}

// When resuming an in-progress evaluation, infer which side of each OR group
// was already chosen from the persisted marks -- whichever sibling has at
// least one step NOT marked NOT_APPLICABLE is the one the evaluator picked.
// Leaves a group unset if nothing's been marked on either side yet.
export function inferSelectedOrOption(
  questions: WorkspaceQuestion[],
  marks: Record<string, StepMark>,
): Record<string, string> {
  const groups = new Map<string, WorkspaceQuestion[]>();
  for (const q of questions) {
    if (!q.optionGroup) continue;
    const list = groups.get(q.optionGroup) ?? [];
    list.push(q);
    groups.set(q.optionGroup, list);
  }

  const result: Record<string, string> = {};
  for (const [group, siblings] of groups) {
    const chosen = siblings.find((q) =>
      q.steps.some((s) => marks[s.id] && marks[s.id]!.attemptStatus !== "NOT_APPLICABLE"),
    );
    if (chosen) {
      result[group] = chosen.id;
    }
  }
  return result;
}
