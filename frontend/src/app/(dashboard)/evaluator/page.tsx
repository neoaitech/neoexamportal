"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { LinkButton } from "@/components/LinkButton";
import { StatusChip } from "@/components/StatusChip";
import { api, ApiError, type AllocationSummaryResponse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function EvaluatorScriptsPage() {
  const { accessToken } = useAuth();
  const [allocations, setAllocations] = useState<AllocationSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getMyAllocations(accessToken)
      .then(setAllocations)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
  }, [accessToken]);

  const handleDelete = async (allocation: AllocationSummaryResponse) => {
    if (!accessToken) return;
    if (!window.confirm(`Delete script ${allocation.scriptCode}? This removes its pages and any marking done so far.`)) {
      return;
    }
    try {
      await api.deleteAllocation(accessToken, allocation.id);
      setAllocations((current) => current?.filter((a) => a.id !== allocation.id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: "secondary.dark", fontWeight: 700, letterSpacing: "0.1em" }}
          >
            YOUR MARKING DESK
          </Typography>
          <Typography variant="h5">
            Assigned scripts{" "}
            <Box component="span" aria-hidden="true">
              📚
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Pick a script to continue marking, or start a new evaluation below.
          </Typography>
        </Box>
      </Stack>

      <Paper
        variant="outlined"
        className="page-enter"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          backgroundImage: "linear-gradient(115deg, #F8E9DC 0%, #FFFCF6 78%)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: 52,
              height: 52,
              display: "grid",
              flexShrink: 0,
              placeItems: "center",
              borderRadius: 3,
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              fontSize: 26,
            }}
          >
            ✨
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Starting a new evaluation?</Typography>
            <Typography variant="body2" color="text.secondary">
              Upload the question paper and answer sheets. We’ll guide you through each step.
            </Typography>
          </Box>
          <LinkButton href="/evaluator/new" variant="contained">
            <Box component="span" aria-hidden="true" sx={{ mr: 1 }}>
              📤
            </Box>
            Upload scripts
          </LinkButton>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {!allocations && !error ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {allocations && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Script code</TableCell>
                <TableCell>Exam</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.id} hover>
                  <TableCell>{allocation.scriptCode}</TableCell>
                  <TableCell>{allocation.examName}</TableCell>
                  <TableCell>
                    <StatusChip status={allocation.status} />
                  </TableCell>
                  <TableCell>{allocation.assignedAt.slice(0, 10)}</TableCell>
                  <TableCell align="right">
                    <LinkButton
                      size="small"
                      href={`/evaluator/scripts/${allocation.id}`}
                    >
                      Open
                    </LinkButton>
                    {allocation.status !== "SUBMITTED" && allocation.status !== "LOCKED" && (
                      <Button size="small" color="error" onClick={() => handleDelete(allocation)}>
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {allocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box component="span" aria-hidden="true" sx={{ fontSize: 24 }}>
                        🗂️
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        No scripts yet. Upload a question paper and answer sheet above to create your first evaluation.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
