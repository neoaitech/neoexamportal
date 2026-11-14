"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ApiError, papersApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import type { SchemeQuestionInput } from "@/lib/evaluation-types";
import { pdfToImageFiles } from "@/lib/pdf-to-images";
import { extractQuestionPaperText, parseQuestionPaperText } from "@/lib/question-paper-extraction";
import { PatternSummary, SchemeEditor, validateScheme } from "./SchemeEditor";

const STEPS = [
  { label: "Question paper", icon: "📄" },
  { label: "Marking scheme", icon: "📝" },
  { label: "Answer sheet", icon: "📚" },
];

function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function NewEvaluationWizard() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const resumePaperId = useSearchParams().get("paper");

  const [step, setStep] = useState(0);
  const [paperId, setPaperId] = useState<string | null>(resumePaperId);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);

  const [examName, setExamName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<SchemeQuestionInput[]>([]);
  const [sheetFiles, setSheetFiles] = useState<File[]>([]);

  // Resume a paper whose upload was started earlier (?paper=<id>).
  useEffect(() => {
    if (!accessToken || !resumePaperId) return;
    papersApi
      .get(accessToken, resumePaperId)
      .then((paper) => {
        if (paper.questions.length > 0) {
          setQuestions(paper.questions);
          setStep(2);
        } else {
          setStep(1);
        }
      })
      .catch((err) => setError(errorText(err)));
  }, [accessToken, resumePaperId]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const readPaperQuestions = async (file: File) => {
    const canExtract =
      file.type === "application/pdf" ||
      /\.pdf$/i.test(file.name) ||
      /\.docx$/i.test(file.name);
    setProgress(canExtract ? "Reading questions and marks from the paper…" : null);
    const extractedQuestions = canExtract
      ? parseQuestionPaperText(await extractQuestionPaperText(file))
      : [];
    setQuestions(extractedQuestions);
    setExtractionMessage(
      extractedQuestions.length > 0
        ? `Suggested ${extractedQuestions.length} questions from the paper. Check every question and mark below before saving.`
        : canExtract
          ? "No questions and marks could be detected. This can happen with scanned PDFs or unusual layouts; add the scheme manually below."
          : "Question extraction supports text-based PDF and DOCX files. Add the scheme manually below.",
    );
  };

  const submitPaper = () =>
    run(async () => {
      if (!accessToken || !paperFile) return;
      await readPaperQuestions(paperFile);
      const form = new FormData();
      form.append("examName", examName.trim());
      form.append("subjectCode", subjectCode.trim());
      form.append("academicYear", academicYear.trim());
      form.append("file", paperFile);
      const created = await papersApi.create(accessToken, form);
      setPaperId(created.id);
      setStep(1);
    });

  const submitScheme = () =>
    run(async () => {
      if (!accessToken || !paperId) return;
      const problem = validateScheme(questions);
      if (problem) throw new Error(problem);
      await papersApi.setScheme(accessToken, paperId, questions);
      setStep(2);
    });

  const submitSheets = () =>
    run(async () => {
      if (!accessToken || !paperId) return;
      const pages: File[] = [];
      for (const file of sheetFiles) {
        if (file.type === "application/pdf") {
          pages.push(
            ...(await pdfToImageFiles(file, (done, total) =>
              setProgress(`Converting ${file.name}: page ${done} of ${total}`),
            )),
          );
        } else {
          pages.push(file);
        }
      }
      setProgress(`Uploading ${pages.length} pages…`);
      const form = new FormData();
      pages.forEach((p) => form.append("pages", p));
      const result = await papersApi.uploadScript(accessToken, paperId, form);
      router.push(`/evaluator/scripts/${result.allocationId}`);
    });

  const detailsValid =
    examName.trim() && subjectCode.trim() && academicYear.trim() && paperFile !== null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1180, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          overflow: "hidden",
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          color: "#FFFCF6",
          backgroundImage: "linear-gradient(115deg, #292520 0%, #41382F 68%, #873D2A 100%)",
        }}
      >
        <Stack
          direction="row"
          sx={{ minHeight: { xs: 130, sm: 150 }, alignItems: "center", justifyContent: "space-between" }}
        >
          <Box sx={{ position: "relative", zIndex: 1, maxWidth: 700 }}>
            <Typography
              variant="overline"
              sx={{ color: "#F0B69C", fontWeight: 700, letterSpacing: "0.12em" }}
            >
              NEW EVALUATION · STEP {step + 1} OF {STEPS.length}
            </Typography>
            <Typography
              variant="h4"
              sx={{ mt: 0.5, color: "inherit", fontWeight: 750, letterSpacing: "-0.03em" }}
            >
              Let’s get your exam ready
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: "rgba(255, 252, 246, 0.78)" }}>
              We’ll guide you through the question paper, marking scheme, and answer sheets.
            </Typography>
          </Box>
          <Box
            aria-hidden="true"
            className="float-gently"
            sx={{
              display: { xs: "none", sm: "grid" },
              width: 112,
              height: 112,
              flexShrink: 0,
              placeItems: "center",
              borderRadius: "50%",
              bgcolor: "rgba(255, 252, 246, 0.12)",
              border: "1px solid rgba(255, 252, 246, 0.2)",
              fontSize: 56,
            }}
          >
            🧑‍🏫
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3 }}>
        <Stepper activeStep={step}>
          {STEPS.map(({ label, icon }) => (
            <Step key={label}>
              <StepLabel icon={<span aria-hidden="true">{icon}</span>}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {busy && <LinearProgress />}
      {progress && (
        <Typography variant="body2" color="text.secondary">
          {progress}
        </Typography>
      )}

      {step === 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(280px, 0.9fr)" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 4,
              boxShadow: "0 14px 36px rgba(41, 37, 32, 0.06)",
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">First, tell us about the exam</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  These details help keep your scripts organized.
                </Typography>
              </Box>

              <TextField
                label="Exam name"
                placeholder="e.g. Mid-year Mathematics"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                fullWidth
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Subject"
                  placeholder="e.g. Mathematics"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Academic year"
                  placeholder="e.g. 2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  fullWidth
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Question paper
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={busy}
                  sx={{
                    width: "100%",
                    minHeight: 150,
                    px: 2,
                    py: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    borderStyle: "dashed",
                    borderWidth: 1.5,
                    borderColor: paperFile ? "success.main" : "divider",
                    bgcolor: paperFile ? "rgba(85, 120, 90, 0.06)" : "#FFFCF6",
                    "&:hover": {
                      borderStyle: "dashed",
                      borderWidth: 1.5,
                      bgcolor: "rgba(184, 93, 66, 0.04)",
                    },
                  }}
                >
                  {paperFile ? (
                    <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
                  ) : (
                    <CloudUploadOutlinedIcon color="secondary" sx={{ fontSize: 34 }} />
                  )}
                  <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 700 }}>
                    {paperFile ? "Question paper selected" : "Choose your question paper"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {paperFile ? paperFile.name : "Click to browse · PDF, DOCX, JPG or PNG · Up to 25 MB"}
                  </Typography>
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {paperFile && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: 1, alignItems: "center", color: "text.secondary" }}
                  >
                    <InsertDriveFileOutlinedIcon fontSize="small" />
                    <Typography variant="caption">Choose this area again to replace the file.</Typography>
                  </Stack>
                )}
              </Box>

              <Stack
                direction={{ xs: "column-reverse", sm: "row" }}
                spacing={1.5}
                sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
              >
                <Typography variant="caption" color="text.secondary">
                  You can review suggested questions in the next step.
                </Typography>
                <Button variant="contained" disabled={busy || !detailsValid} onClick={submitPaper}>
                  Upload paper &amp; continue
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 4,
              bgcolor: "#F3EADD",
              borderColor: "transparent",
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">
                  What you’ll need{" "}
                  <Box component="span" aria-hidden="true">
                    🎒
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Just three things to get started.
                </Typography>
              </Box>

              {[
                ["1", "Exam details", "Name, subject, and academic year."],
                ["2", "Question paper", "A PDF, Word document, or image."],
                ["3", "Marking scheme", "We’ll suggest one you can review."],
              ].map(([number, title, description]) => (
                <Stack key={number} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "50%",
                      bgcolor: "background.paper",
                      color: "secondary.dark",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {number}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">{title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {description}
                    </Typography>
                  </Box>
                </Stack>
              ))}

              <Alert severity="info" sx={{ bgcolor: "rgba(255, 252, 246, 0.72)" }}>
                Scanned question paper? No problem—you can enter the marking scheme yourself.
              </Alert>
            </Stack>
          </Paper>
        </Box>
      )}

      {step === 1 && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Review the suggested questions and marks extracted from your paper, correct anything
            that is missing or incorrect, and add marking steps or OR groups if needed.
          </Typography>
          {paperFile && (
            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => run(() => readPaperQuestions(paperFile))}
              >
                Re-read question paper
              </Button>
            </Stack>
          )}
          {extractionMessage && <Alert severity="info">{extractionMessage}</Alert>}
          <SchemeEditor questions={questions} onChange={setQuestions} disabled={busy} />
          <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
            <Button variant="contained" disabled={busy} onClick={submitScheme}>
              Save scheme &amp; continue
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <PatternSummary questions={questions} />
            <Typography variant="body2" color="text.secondary">
              Upload the scanned answer sheet as one PDF or as page images (in order).
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Button variant="outlined" component="label">
                Choose answer sheet
                <input
                  hidden
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) =>
                    setSheetFiles(
                      Array.from(e.target.files ?? []).sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, { numeric: true }),
                      ),
                    )
                  }
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {sheetFiles.length === 0
                  ? "No files selected"
                  : `${sheetFiles.length} file${sheetFiles.length === 1 ? "" : "s"} selected`}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button disabled={busy} onClick={() => setStep(1)}>
                Back to scheme
              </Button>
              <Button variant="contained" disabled={busy || sheetFiles.length === 0} onClick={submitSheets}>
                Upload &amp; start evaluating
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
