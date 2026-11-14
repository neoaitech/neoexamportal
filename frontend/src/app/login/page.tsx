"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlternateEmailOutlinedIcon from "@mui/icons-material/AlternateEmailOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { roleHomePath } from "@/lib/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { status, user, login, verifyOtp } = useAuth();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Already have a valid session (e.g. revisiting /login directly) -- skip
  // straight to that role's dashboard instead of showing the form again.
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [status, user, router]);

  async function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setStep("otp");
      } else {
        router.push(roleHomePath(result.user.role));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setSubmitting(true);
    try {
      const authUser = await verifyOtp(mfaToken, otp);
      router.push(roleHomePath(authUser.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1.5, sm: 3 },
        backgroundImage:
          "radial-gradient(circle at 8% 12%, rgba(184, 93, 66, 0.12), transparent 28%), radial-gradient(circle at 92% 88%, rgba(85, 120, 90, 0.1), transparent 30%)",
        bgcolor: "background.default",
      }}
    >
      <Card
        className="page-enter"
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1080,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "0.92fr 1.08fr" },
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          borderRadius: { xs: 4, md: 5 },
          boxShadow: "0 28px 80px rgba(41, 37, 32, 0.14)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: { md: 4, lg: 5 },
            color: "#FFFCF6",
            backgroundImage: "linear-gradient(145deg, #292520 0%, #41382F 62%, #873D2A 100%)",
          }}
        >
          <Box
            aria-hidden="true"
            className="float-gently"
            sx={{
              position: "absolute",
              top: 60,
              right: -48,
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: "1px solid rgba(255, 252, 246, 0.12)",
              boxShadow: "0 0 0 28px rgba(255, 252, 246, 0.035), 0 0 0 58px rgba(255, 252, 246, 0.025)",
            }}
          />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", position: "relative" }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                display: "grid",
                placeItems: "center",
                borderRadius: 3,
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
              }}
            >
              <MenuBookOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Marking Platform
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={3} sx={{ position: "relative", my: 3 }}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "#F0B69C", fontWeight: 700, letterSpacing: "0.12em" }}
              >
                MADE FOR CLEARER MARKING
              </Typography>
              <Typography
                variant="h3"
                component="h1"
                sx={{ mt: 1, fontWeight: 750, lineHeight: 1.08, letterSpacing: "-0.04em" }}
              >
                Make every
                <br />
                mark count.
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, maxWidth: 360, color: "rgba(255, 252, 246, 0.78)" }}>
                A thoughtful workspace for reviewing scripts and marking with confidence.
              </Typography>
            </Box>

            <Stack spacing={1.25}>
              {[
                { icon: "📚", title: "Keep exams organized", detail: "Find your scripts in one place." },
                { icon: "✅", title: "Follow a clear scheme", detail: "Review marking steps as you work." },
                { icon: "🔒", title: "Sign in securely", detail: "Your workspace is for your account." },
              ].map((item) => (
                <Stack
                  key={item.title}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    p: 1.25,
                    borderRadius: 3,
                    bgcolor: "rgba(255, 252, 246, 0.08)",
                    border: "1px solid rgba(255, 252, 246, 0.1)",
                  }}
                >
                  <Box aria-hidden="true" sx={{ fontSize: 22 }}>
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255, 252, 246, 0.68)" }}>
                      {item.detail}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Stack>

        </Box>

        <CardContent
          sx={{
            display: "flex",
            alignItems: "center",
            p: { xs: 2.5, sm: 4, lg: 5 },
            "&:last-child": { pb: { xs: 2.5, sm: 4, lg: 5 } },
          }}
        >
          <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", display: { xs: "flex", md: "none" } }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 3,
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                }}
              >
                <MenuBookOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  OSM Platform
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Exam marking workspace
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Paper
                variant="outlined"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  mb: 2,
                  borderRadius: 99,
                  bgcolor: "rgba(184, 93, 66, 0.07)",
                  borderColor: "rgba(184, 93, 66, 0.16)",
                }}
              >
                <SecurityOutlinedIcon sx={{ color: "secondary.dark", fontSize: 17 }} />
                <Typography variant="caption" sx={{ color: "secondary.dark", fontWeight: 700 }}>
                  {step === "credentials" ? "SECURE SIGN-IN" : "TWO-STEP VERIFICATION"}
                </Typography>
              </Paper>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 750, letterSpacing: "-0.035em" }}>
                {step === "credentials" ? "Welcome back" : "Check it’s you"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {step === "credentials"
                  ? "Sign in with your school account to continue."
                  : "Enter the 6-digit code from your authenticator app."}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {step === "credentials" ? (
              <Box component="form" onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    placeholder="you@school.edu"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    autoFocus
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <AlternateEmailOutlinedIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                      },
                      htmlInput: { autoComplete: "email" },
                    }}
                  />
                  <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              onClick={() => setShowPassword((visible) => !visible)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                      htmlInput: { autoComplete: "current-password" },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    endIcon={!submitting && <ArrowForwardRoundedIcon />}
                    sx={{ minHeight: 48, mt: 0.5 }}
                  >
                    {submitting ? <CircularProgress size={22} color="inherit" /> : "Continue"}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleOtpSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="6-digit code"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    slotProps={{
                      htmlInput: {
                        maxLength: 6,
                        inputMode: "numeric",
                        autoComplete: "one-time-code",
                      },
                    }}
                    required
                    fullWidth
                    autoFocus
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting || otp.length !== 6}
                    endIcon={!submitting && <ArrowForwardRoundedIcon />}
                    sx={{ minHeight: 48 }}
                  >
                    {submitting ? <CircularProgress size={22} color="inherit" /> : "Verify and sign in"}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setStep("credentials");
                      setMfaToken(null);
                      setOtp("");
                      setError(null);
                    }}
                  >
                    Back to sign in
                  </Button>
                </Stack>
              </Box>
            )}

            <Divider />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <FactCheckOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Need access? Contact your school administrator.
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
