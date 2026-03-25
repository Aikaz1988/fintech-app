import { createTheme } from '@mui/material/styles';

// Define standard light theme for the financial app
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgb(33, 150, 243)', // Blue
      light: 'rgb(77, 171, 245)',
      dark: 'rgb(23, 105, 170)',
    },
    secondary: {
      main: 'rgb(156, 39, 176)', // Purple
    },
    success: {
      main: 'rgb(76, 175, 80)', // Green for income
    },
    error: {
      main: 'rgb(244, 67, 54)', // Red for expenses
    },
    background: {
      default: 'rgb(248, 249, 250)', // Light gray background
      paper: 'rgb(255, 255, 255)', // White cards
    },
    text: {
      primary: 'rgb(33, 37, 41)',
      secondary: 'rgb(108, 117, 125)',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});