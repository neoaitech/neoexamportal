import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#292520",
      light: "#50483F",
      dark: "#171410",
      contrastText: "#FFFCF6",
    },
    secondary: {
      main: "#B85D42",
      light: "#D98A6B",
      dark: "#873D2A",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F6F0E7",
      paper: "#FFFCF6",
    },
    text: {
      primary: "#292520",
      secondary: "#70665C",
    },
    divider: "#E5D9C9",
    success: {
      main: "#55785A",
    },
    warning: {
      main: "#A76B28",
    },
    info: {
      main: "#52788A",
    },
    error: {
      main: "#B44D42",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 650,
      letterSpacing: "-0.01em",
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 40,
          transition: "transform 160ms ease, box-shadow 160ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: "#E5D9C9",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#F3EADD",
          color: "#51473D",
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 160ms ease",
        },
      },
    },
  },
});
