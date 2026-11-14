"use client";

import { useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { WorkspaceQuestion } from "@/lib/evaluation-types";
import {
  getGrandTotal,
  getQuestionTotal,
  getUnreviewedPages,
  getValidationIssues,
} from "@/lib/evaluation-selectors";
import { useEvaluationStore } from "@/store/evaluationStore";
import { StepMarkRow } from "./StepMarkRow";

interface QuestionGroup {
  key: string;
  optionGroup: string | null;
  questions: WorkspaceQuestion[];
}

function groupQuestions(questions: WorkspaceQuestion[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (q.optionGroup) {
      if (seen.has(q.optionGroup)) continue;
      seen.add(q.optionGroup);
      groups.push({
        key: q.optionGroup,
        optionGroup: q.optionGroup,
        questions: questions.filter((s) => s.optionGroup === q.optionGroup),
      });
    } else {
      groups.push({ key: q.id, optionGroup: null, questions: [q] });
    }
  }
  return groups;
}

// "Q5(a) / Q5(b)" -> "Q5"; plain questions keep their number.
function groupLabel(group: QuestionGroup): string {
  return group.questions[0].questionNumber.replace(/\s*\(.*\)\s*$/, "");
}

export function RubricPanel() {
  const questions = useEvaluationStore((s) => s.questions);
  const marks = useEvaluationStore((s) => s.marks);
  const pages = useEvaluationStore((s) => s.pages);
  const selectedOrOption = useEvaluationStore((s) => s.selectedOrOption);
  const chooseOrOption = useEvaluationStore((s) => s.chooseOrOption);
  const allocationStatus = useEvaluationStore((s) => s.allocationStatus);
  const submit = useEvaluationStore((s) => s.submit);
  const submitted = allocationStatus === "SUBMITTED" || allocationStatus === "LOCKED";
  const [submitting, setSubmitting] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groups = useMemo(() => groupQuestions(questions), [questions]);
  const grandTotal = useMemo(
    () => getGrandTotal(questions, marks),
    [questions, marks],
  );
  const validationIssues = useMemo(
    () => getValidationIssues(questions, marks),
    [questions, marks],
  );
  const unreviewedPages = useMemo(() => getUnreviewedPages(pages), [pages]);

  function goToGroup(key: string) {
    setActiveGroupKey(key);
    cardRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isGroupComplete(group: QuestionGroup): boolean {
    const chosenId = group.optionGroup ? selectedOrOption[group.optionGroup] : undefined;
    const question = group.optionGroup
      ? group.questions.find((q) => q.id === chosenId)
      : group.questions[0];
    return (
      !!question &&
      question.steps.every((step) => {
        const mark = marks[step.id];
        return !!mark && mark.attemptStatus !== null;
      })
    );
  }

  async function handleSubmit() {
    if (validationIssues.length > 0 || unreviewedPages.length > 0) {
      setShowIssues(true);
      return;
    }
    setShowIssues(false);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await submit();
      if (!result.ok) {
        // Server found something the client-side check missed (or the
        // request failed outright) -- surface it rather than pretend success.
        if (result.unresolvedSteps || result.unreviewedPages) {
          setShowIssues(true);
        } else {
          setSubmitError(result.message ?? "Submission failed");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Typography variant="h6">Rubric &amp; scoring</Typography>

      {/* Question-wise navigation: one chip per question in the paper, so the
          navigator follows whatever paper the exam has. */}
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
        {groups.map((group) => (
          <Chip
            key={group.key}
            label={groupLabel(group)}
            size="small"
            clickable
            color={isGroupComplete(group) ? "success" : "default"}
            variant={activeGroupKey === group.key ? "filled" : "outlined"}
            onClick={() => goToGroup(group.key)}
          />
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5 }}>
        <Stack spacing={1.5}>
          {groups.map((group) => {
            const activeQuestion =
              group.optionGroup && selectedOrOption[group.optionGroup]
                ? group.questions.find(
                    (q) => q.id === selectedOrOption[group.optionGroup!],
                  )
                : group.questions[0];

            return (
              <Card
                key={group.key}
                variant="outlined"
                ref={(el: HTMLDivElement | null) => {
                  cardRefs.current[group.key] = el;
                }}
                sx={activeGroupKey === group.key ? { borderColor: "primary.main" } : undefined}
              >
                <CardContent>
                  {group.optionGroup ? (
                    <Stack spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">
                        {group.questions.map((q) => q.questionNumber).join(" / ")}{" "}
                        <Typography component="span" variant="caption" color="text.secondary">
                          (attempt one)
                        </Typography>
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={selectedOrOption[group.optionGroup] ?? null}
                        onChange={(_, value) =>
                          value && chooseOrOption(group.optionGroup!, value)
                        }
                      >
                        {group.questions.map((q) => (
                          <ToggleButton key={q.id} value={q.id}>
                            {q.questionNumber}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Stack>
                  ) : (
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {group.questions[0].questionNumber}
                    </Typography>
                  )}

                  {activeQuestion ? (
                    <>
                      <Divider sx={{ mb: 0.5 }} />
                      {activeQuestion.steps.map((step) => (
                        <StepMarkRow
                          key={step.id}
                          step={step}
                          mark={marks[step.id]}
                          disabled={submitted}
                        />
                      ))}
                      <Divider sx={{ mt: 0.5, mb: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        Subtotal: {getQuestionTotal(activeQuestion, marks)} /{" "}
                        {activeQuestion.maxMarks}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Select which question the candidate attempted.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>

      <Divider />

      <Stack spacing={1}>
        <Typography variant="h6">
          Total: {grandTotal.awarded} / {grandTotal.max}
        </Typography>

        {showIssues && (validationIssues.length > 0 || unreviewedPages.length > 0) && (
          <Alert severity="warning" onClose={() => setShowIssues(false)}>
            {unreviewedPages.length > 0 && (
              <Typography variant="body2">
                {unreviewedPages.length} page(s) still need review. Open each page and select
                &quot;Mark page reviewed&quot;, add a grading annotation, or mark it blank.
              </Typography>
            )}
            {validationIssues.length > 0 && (
              <Typography variant="body2">
                {validationIssues.length} step(s) still need a mark or an
                explicit &quot;not attempted&quot;.
              </Typography>
            )}
          </Alert>
        )}

        {submitError && (
          <Alert severity="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}

        {submitted ? (
          <Alert severity="success">Evaluation submitted for moderation.</Alert>
        ) : (
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : "Submit evaluation"}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
