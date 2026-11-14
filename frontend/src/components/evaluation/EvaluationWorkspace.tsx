"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/StatusChip";
import { useAuth } from "@/lib/AuthContext";
import { useEvaluationStore } from "@/store/evaluationStore";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { PageCanvas } from "./PageCanvas";
import { PageNavigator } from "./PageNavigator";
import { QuestionPaperView } from "./QuestionPaperView";
import { RubricPanel } from "./RubricPanel";

export function EvaluationWorkspace({ allocationId }: { allocationId: string }) {
  const { accessToken } = useAuth();
  const [sideTab, setSideTab] = useState<"rubric" | "paper">("rubric");
  const initialize = useEvaluationStore((s) => s.initialize);
  const status = useEvaluationStore((s) => s.status);
  const loadError = useEvaluationStore((s) => s.error);
  const clearError = useEvaluationStore((s) => s.clearError);
  const pages = useEvaluationStore((s) => s.pages);
  const currentPageIndex = useEvaluationStore((s) => s.currentPageIndex);
  const scriptCode = useEvaluationStore((s) => s.scriptCode);
  const examName = useEvaluationStore((s) => s.examName);
  const allocationStatus = useEvaluationStore((s) => s.allocationStatus);

  useEffect(() => {
    if (accessToken) {
      void initialize(allocationId, accessToken);
    }
  }, [allocationId, accessToken, initialize]);

  if (status === "loading" || status === "idle") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === "error") {
    return <Alert severity="error">{loadError ?? "Failed to load this evaluation."}</Alert>;
  }

  const currentPage = pages[currentPageIndex];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="h5">{scriptCode}</Typography>
        {allocationStatus && <StatusChip status={allocationStatus} />}
        <Typography variant="body2" color="text.secondary">
          {examName}
        </Typography>
      </Stack>

      {loadError && (
        <Alert severity="warning" onClose={clearError}>
          {loadError}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{ height: "calc(100vh - 112px)" }}
      >
        <Stack spacing={1.5} sx={{ flex: "1 1 68%", minWidth: 0 }}>
          {currentPage && <AnnotationToolbar page={currentPage} />}

          <Paper
            variant="outlined"
            sx={{ flexGrow: 1, overflow: "auto", bgcolor: "#e8e8e8", p: 2 }}
          >
            {currentPage && <PageCanvas page={currentPage} />}
          </Paper>

          <PageNavigator />
        </Stack>

        <Box sx={{ flex: "1 1 32%", minWidth: 320 }}>
          <Paper
            variant="outlined"
            sx={{ height: "100%", p: 2, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <Tabs
              value={sideTab}
              onChange={(_, value: "rubric" | "paper") => setSideTab(value)}
              aria-label="Evaluation reference"
              sx={{ mb: 1.5 }}
            >
              <Tab
                id="evaluation-tab-rubric"
                aria-controls="evaluation-panel-rubric"
                value="rubric"
                label="Rubric & scoring"
              />
              <Tab
                id="evaluation-tab-paper"
                aria-controls="evaluation-panel-paper"
                value="paper"
                label="Question paper"
              />
            </Tabs>
            <Box
              role="tabpanel"
              id={`evaluation-panel-${sideTab}`}
              aria-labelledby={`evaluation-tab-${sideTab}`}
              sx={{ flex: 1, minHeight: 0, overflow: "auto" }}
            >
              {sideTab === "rubric" ? <RubricPanel /> : <QuestionPaperView />}
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Stack>
  );
}
