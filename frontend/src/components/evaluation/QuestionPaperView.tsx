"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEvaluationStore } from "@/store/evaluationStore";

// The question paper the evaluator uploaded, shown as-is (layouts vary per
// exam, so nothing is parsed). Falls back to the marking scheme when the exam
// has no uploaded file.
export function QuestionPaperView({ height = "70vh" }: { height?: string }) {
  const paper = useEvaluationStore((s) => s.questionPaper);
  const questions = useEvaluationStore((s) => s.questions);

  if (!paper) {
    return (
      <Typography color="text.secondary">
        Open a script from &ldquo;My scripts&rdquo; to view its question paper.
      </Typography>
    );
  }

  const mime = paper.fileMime ?? "";
  const canEmbed = mime === "application/pdf" || mime.startsWith("image/");

  return (
    <Stack spacing={1.5} sx={{ height: "100%" }}>
      {paper.fileUrl && mime === "application/pdf" && (
        <Box
          component="iframe"
          src={paper.fileUrl}
          title="Question paper"
          sx={{ width: "100%", height, border: 0 }}
        />
      )}
      {paper.fileUrl && mime.startsWith("image/") && (
        <Box sx={{ overflow: "auto", height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={paper.fileUrl} alt="Question paper" style={{ maxWidth: "100%" }} />
        </Box>
      )}
      {paper.fileUrl && !canEmbed && (
        <Typography color="text.secondary">
          {paper.fileName} can&apos;t be previewed in the browser. Use the download button.
        </Typography>
      )}
      {!paper.fileUrl && (
        <Typography color="text.secondary">
          No question paper file was uploaded for this exam. Marking scheme:
        </Typography>
      )}
      {!canEmbed && (
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          {questions.map((q) => (
            <li key={q.id}>
              <Typography variant="body2">
                {q.questionNumber} — {q.maxMarks} marks
              </Typography>
            </li>
          ))}
        </Box>
      )}
      {paper.fileUrl && (
        <Box>
          <Button size="small" component="a" href={paper.fileUrl} download={paper.fileName ?? undefined}>
            Download original
          </Button>
        </Box>
      )}
    </Stack>
  );
}
