"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SchemeQuestionInput } from "@/lib/evaluation-types";

export function emptyQuestion(index: number): SchemeQuestionInput {
  return { questionNumber: `Q${index + 1}`, maxMarks: 0, optionGroup: null, steps: [] };
}

// Alternatives in an option group count once towards the total.
export function schemeTotal(questions: SchemeQuestionInput[]): number {
  const groups = new Map<string, number>();
  let total = 0;
  for (const q of questions) {
    if (q.optionGroup) groups.set(q.optionGroup, Math.max(groups.get(q.optionGroup) ?? 0, q.maxMarks));
    else total += q.maxMarks;
  }
  for (const m of groups.values()) total += m;
  return total;
}

// Returns a human-readable problem, or null when the scheme can be saved.
export function validateScheme(questions: SchemeQuestionInput[]): string | null {
  if (questions.length === 0) return "Add at least one question.";
  const seen = new Set<string>();
  for (const q of questions) {
    const number = q.questionNumber.trim();
    if (!number) return "Every question needs a number.";
    if (seen.has(number)) return `Question number ${number} is used twice.`;
    seen.add(number);
    if (!(q.maxMarks > 0)) return `${number}: marks must be greater than 0.`;
    if (q.steps.length > 0) {
      const sum = q.steps.reduce((acc, s) => acc + s.maxMarks, 0);
      if (Math.abs(sum - q.maxMarks) > 0.001) {
        return `${number}: step marks (${sum}) must add up to ${q.maxMarks}.`;
      }
      if (q.steps.some((s) => !s.description.trim())) return `${number}: every step needs a description.`;
    }
  }
  return null;
}

interface Props {
  questions: SchemeQuestionInput[];
  onChange: (questions: SchemeQuestionInput[]) => void;
  disabled?: boolean;
}

// One-line way to add a question: "attempt N answers, k marks each". Builds
// the per-answer marking steps so the evaluator doesn't type them one by one.
function QuickAdd({
  questions,
  onChange,
  disabled,
}: Props) {
  const [label, setLabel] = useState("");
  const [count, setCount] = useState(1);
  const [each, setEach] = useState(1);

  const nextLabel = label.trim() || `Q${questions.length + 1}`;
  const valid = count >= 1 && Number.isInteger(count) && each > 0;

  const add = () => {
    const steps =
      count > 1
        ? Array.from({ length: count }, (_, i) => ({ description: `Answer ${i + 1}`, maxMarks: each }))
        : [];
    onChange([
      ...questions,
      { questionNumber: nextLabel, maxMarks: count * each, optionGroup: null, steps },
    ]);
    setLabel("");
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Quick add
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1.5 }}>
        <TextField
          label="Question"
          size="small"
          value={label}
          placeholder={nextLabel}
          disabled={disabled}
          onChange={(e) => setLabel(e.target.value)}
          sx={{ width: 130 }}
        />
        <TextField
          label="Answers to attempt"
          size="small"
          type="number"
          value={count}
          disabled={disabled}
          onChange={(e) => setCount(Number(e.target.value))}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Marks each"
          size="small"
          type="number"
          value={each}
          disabled={disabled}
          onChange={(e) => setEach(Number(e.target.value))}
          slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
          sx={{ width: 120 }}
        />
        <Typography variant="body2" color="text.secondary">
          = {valid ? count * each : 0} marks
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} disabled={disabled || !valid} onClick={add}>
          Add
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        e.g. &ldquo;Q.2 &mdash; Attempt any 5, 2 marks each&rdquo; &rarr; Answers 5, Marks each 2.
      </Typography>
    </Paper>
  );
}

export function SchemeEditor({ questions, onChange, disabled }: Props) {
  const update = (index: number, patch: Partial<SchemeQuestionInput>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <Stack spacing={2}>
      <QuickAdd questions={questions} onChange={onChange} disabled={disabled} />
      {questions.map((q, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <TextField
                label="Question"
                size="small"
                value={q.questionNumber}
                disabled={disabled}
                onChange={(e) => update(index, { questionNumber: e.target.value })}
                sx={{ width: 130 }}
              />
              <TextField
                label="Max marks"
                size="small"
                type="number"
                value={q.maxMarks}
                disabled={disabled}
                onChange={(e) => update(index, { maxMarks: Number(e.target.value) })}
                slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                sx={{ width: 120 }}
              />
              <TextField
                label="OR group (optional)"
                size="small"
                value={q.optionGroup ?? ""}
                disabled={disabled}
                helperText="Same label = attempt only one"
                onChange={(e) => update(index, { optionGroup: e.target.value.trim() || null })}
                sx={{ width: 190 }}
              />
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                aria-label={`Remove ${q.questionNumber}`}
                disabled={disabled}
                onClick={() => onChange(questions.filter((_, i) => i !== index))}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>

            {q.steps.map((s, si) => (
              <Stack key={si} direction="row" spacing={1.5} sx={{ pl: 3 }}>
                <TextField
                  label={`Step ${si + 1}`}
                  size="small"
                  fullWidth
                  value={s.description}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, {
                      steps: q.steps.map((x, i) => (i === si ? { ...x, description: e.target.value } : x)),
                    })
                  }
                />
                <TextField
                  label="Marks"
                  size="small"
                  type="number"
                  value={s.maxMarks}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, {
                      steps: q.steps.map((x, i) => (i === si ? { ...x, maxMarks: Number(e.target.value) } : x)),
                    })
                  }
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  sx={{ width: 100 }}
                />
                <IconButton
                  aria-label="Remove step"
                  disabled={disabled}
                  onClick={() => update(index, { steps: q.steps.filter((_, i) => i !== si) })}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}

            <Box sx={{ pl: 3 }}>
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={disabled}
                onClick={() =>
                  update(index, { steps: [...q.steps, { description: "", maxMarks: 0 }] })
                }
              >
                Add marking step
              </Button>
              {q.steps.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  No steps: the question is marked as a whole.
                </Typography>
              )}
            </Box>
          </Stack>
        </Paper>
      ))}

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Button
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => onChange([...questions, emptyQuestion(questions.length)])}
        >
          Add question
        </Button>
        <Typography variant="subtitle2">Paper total: {schemeTotal(questions)} marks</Typography>
      </Stack>
    </Stack>
  );
}

// Read-only overview of the detected pattern, e.g. "Q.2 - 10 marks (5 x 2)".
export function PatternSummary({ questions }: { questions: SchemeQuestionInput[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Marking pattern &middot; {schemeTotal(questions)} marks
      </Typography>
      <Stack spacing={0.5}>
        {questions.map((q, i) => {
          const equal =
            q.steps.length > 1 && q.steps.every((s) => s.maxMarks === q.steps[0].maxMarks);
          const detail = equal
            ? ` (${q.steps.length} × ${q.steps[0].maxMarks})`
            : q.steps.length > 1
              ? ` (${q.steps.map((s) => s.maxMarks).join(" + ")})`
              : "";
          return (
            <Typography key={i} variant="body2">
              {q.questionNumber} &mdash; {q.maxMarks} marks{detail}
              {q.optionGroup ? " · alternative" : ""}
            </Typography>
          );
        })}
      </Stack>
    </Paper>
  );
}
