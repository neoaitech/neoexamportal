"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import NearMeIcon from "@mui/icons-material/NearMe";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import type { WorkspacePage } from "@/lib/evaluation-types";
import { useEvaluationStore } from "@/store/evaluationStore";

export function AnnotationToolbar({ page }: { page: WorkspacePage }) {
  const tool = useEvaluationStore((s) => s.tool);
  const setTool = useEvaluationStore((s) => s.setTool);
  const selectedAnnotationId = useEvaluationStore((s) => s.selectedAnnotationId);
  const deleteAnnotation = useEvaluationStore((s) => s.deleteAnnotation);
  const setPageBlank = useEvaluationStore((s) => s.setPageBlank);
  const setPageReviewed = useEvaluationStore((s) => s.setPageReviewed);

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <ToggleButtonGroup
        value={tool}
        exclusive
        size="small"
        onChange={(_, value) => value && setTool(value)}
      >
        <ToggleButton value="select">
          <Tooltip title="Select / move">
            <NearMeIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="tick">
          <Tooltip title="Tick mark">
            <CheckIcon fontSize="small" sx={{ color: "success.main" }} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="cross">
          <Tooltip title="Cross mark">
            <CloseIcon fontSize="small" sx={{ color: "error.main" }} />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="note">
          <Tooltip title="Add note">
            <NoteAddIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Button
        size="small"
        startIcon={<DeleteIcon />}
        disabled={!selectedAnnotationId}
        onClick={() =>
          selectedAnnotationId && deleteAnnotation(page.id, selectedAnnotationId)
        }
      >
        Delete
      </Button>

      <Divider orientation="vertical" flexItem />

      <Button
        size="small"
        variant={page.isReviewed ? "contained" : "outlined"}
        color={page.isReviewed ? "success" : "inherit"}
        onClick={() => setPageReviewed(page.id, !page.isReviewed)}
      >
        {page.isReviewed ? "Page reviewed" : "Mark page reviewed"}
      </Button>

      <Button
        size="small"
        variant={page.isBlank ? "contained" : "outlined"}
        color={page.isBlank ? "warning" : "inherit"}
        onClick={() => setPageBlank(page.id, !page.isBlank)}
      >
        {page.isBlank ? "Unmark blank" : "Mark page blank"}
      </Button>

      <Box sx={{ flexGrow: 1 }} />
    </Stack>
  );
}
