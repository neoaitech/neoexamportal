"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/lib/AuthContext";
import { navItemsByRole, roleHomePath, roleLabels } from "@/lib/navigation";

const DRAWER_WIDTH = 240;

function NavigationIcon({ href }: { href: string }) {
  switch (href) {
    case "/admin":
    case "/chief-evaluator":
      return <DashboardOutlinedIcon fontSize="small" />;
    case "/admin/exams":
      return <MenuBookOutlinedIcon fontSize="small" />;
    case "/admin/allocations":
      return <AssignmentTurnedInOutlinedIcon fontSize="small" />;
    case "/admin/users":
      return <PeopleAltOutlinedIcon fontSize="small" />;
    case "/chief-evaluator/moderation":
      return <RateReviewOutlinedIcon fontSize="small" />;
    case "/evaluator":
      return <AssignmentOutlinedIcon fontSize="small" />;
    case "/evaluator/new":
      return <CloudUploadOutlinedIcon fontSize="small" />;
    default:
      return <MenuBookOutlinedIcon fontSize="small" />;
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const navItems = navItemsByRole[user.role];
  const activeNavHref = navItems.reduce<string | null>((active, item) => {
    const matchesPath = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return matchesPath && (!active || item.href.length > active.length) ? item.href : active;
  }, null);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          color: "text.primary",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundImage: "linear-gradient(90deg, #B85D42, #D7A36F 48%, transparent 90%)",
          },
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, minHeight: "76px !important", px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexGrow: 1, minWidth: 0 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: 2.5,
                bgcolor: "rgba(184, 93, 66, 0.12)",
                color: "secondary.dark",
              }}
            >
              <MenuBookOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{ display: "block", color: "secondary.dark", fontWeight: 700, lineHeight: 1.2 }}
              >
                EVALUATION WORKSPACE
              </Typography>
              <Typography variant="h6" component="div" noWrap>
                Digital Exam Evaluation
              </Typography>
            </Box>
          </Stack>
          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 1,
              py: 0.5,
              px: 1,
              borderRadius: 99,
              bgcolor: "background.default",
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              {user.email.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", lg: "block" }, maxWidth: 180 }}
              noWrap
            >
              {user.email}
            </Typography>
            <Chip label={roleLabels[user.role]} color="primary" size="small" />
          </Paper>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon />}
            aria-label="Log out"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            sx={{ borderRadius: 99, bgcolor: "background.paper", px: { xs: 1, sm: 1.75 } }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Log out
            </Box>
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            bgcolor: "#F1E7D8",
            borderColor: "divider",
            px: 1.25,
          },
        }}
      >
        <Toolbar disableGutters sx={{ minHeight: "88px !important", px: 1.25 }}>
          <Box
            component={Link}
            href={roleHomePath(user.role)}
            aria-label="OSM Platform home"
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 3,
              color: "inherit",
              textDecoration: "none",
              transition: "background-color 160ms ease",
              "&:hover": { bgcolor: "rgba(255, 252, 246, 0.68)" },
              "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main" },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: 3,
                backgroundImage: "linear-gradient(145deg, #C96D4E, #A84832)",
                color: "#FFFFFF",
                boxShadow: "0 6px 12px rgba(135, 61, 42, 0.2)",
              }}
            >
              <MenuBookOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 750, lineHeight: 1.15 }}>
                Marking Platform
              </Typography>
            </Box>
          </Box>
        </Toolbar>
        <Divider sx={{ mx: 1.25, borderColor: "rgba(112, 102, 92, 0.18)" }} />
        <List sx={{ px: 0.5, pt: 1 }}>
          <Typography
            variant="overline"
            sx={{
              px: 1.75,
              pb: 0.5,
              color: "text.secondary",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            WORKSPACE
          </Typography>
          {navItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={activeNavHref === item.href}
              sx={{
                minHeight: 48,
                mb: 0.75,
                borderRadius: 2.5,
                color: "text.secondary",
                transition: "background-color 160ms ease, color 160ms ease, transform 160ms ease",
                "& .MuiListItemIcon-root": { color: "inherit" },
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  boxShadow: "0 8px 18px rgba(41, 37, 32, 0.14)",
                  "&:hover": { bgcolor: "primary.dark", transform: "translateX(2px)" },
                  "& .MuiListItemText-secondary": { color: "rgba(255, 252, 246, 0.72)" },
                },
                "&:hover": {
                  bgcolor: "rgba(41, 37, 32, 0.06)",
                  transform: "translateX(2px)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                <NavigationIcon href={item.href} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                sx={{
                  "& .MuiListItemText-primary": { fontWeight: 600, fontSize: "0.92rem" },
                }}
              />
            </ListItemButton>
          ))}
        </List>
        {user.role === "EVALUATOR" && (
          <Paper
            variant="outlined"
            sx={{
              mx: 1.25,
              mt: "auto",
              mb: 2,
              p: 1.5,
              borderRadius: 3,
              bgcolor: "rgba(255, 252, 246, 0.78)",
              borderColor: "rgba(112, 102, 92, 0.18)",
            }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Quick guide
                </Typography>
                <Box component="span" aria-hidden="true">
                  ✨
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Add a question paper, check the marking scheme, then upload answer sheets.
              </Typography>
              <Button
                component={Link}
                href={pathname.startsWith("/evaluator/new") ? "/evaluator" : "/evaluator/new"}
                size="small"
                variant="contained"
                fullWidth
                sx={{ mt: 0.5 }}
              >
                {pathname.startsWith("/evaluator/new") ? "View assigned scripts" : "Start an evaluation"}
              </Button>
            </Stack>
          </Paper>
        )}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, lg: 4 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar sx={{ minHeight: "72px !important" }} />
        <Box key={pathname} className="page-enter">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
