"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEvaluationStore } from "@/store/evaluationStore";

export function PageNavigator() {
  const pages = useEvaluationStore((s) => s.pages);
  const currentPageIndex = useEvaluationStore((s) => s.currentPageIndex);
  const goToPage = useEvaluationStore((s) => s.goToPage);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <Button
        size="small"
        disabled={currentPageIndex === 0}
        onClick={() => goToPage(currentPageIndex - 1)}
      >
        Previous
      </Button>
      <Typography variant="body2" sx={{ mx: 1 }}>
        Page {currentPageIndex + 1} of {pages.length}
      </Typography>
      <Button
        size="small"
        disabled={currentPageIndex === pages.length - 1}
        onClick={() => goToPage(currentPageIndex + 1)}
      >
        Next
      </Button>

      <Stack direction="row" spacing={0.5} sx={{ ml: 2, flexWrap: "wrap" }}>
        {pages.map((page, index) => {
          const reviewed = page.isBlank || page.isReviewed || page.annotations.length > 0;
          return (
            <Chip
              key={page.id}
              label={page.pageNumber}
              size="small"
              variant={index === currentPageIndex ? "filled" : "outlined"}
              color={reviewed ? "success" : "default"}
              onClick={() => goToPage(index)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
