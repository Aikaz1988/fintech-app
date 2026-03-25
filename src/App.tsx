import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { CssBaseline, Box, CircularProgress, AppBar, Toolbar, IconButton, Typography, Drawer } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Menu } from "lucide-react";
import { theme } from "./theme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { I18nProvider } from "./i18n";

// Import pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Subscriptions from "./pages/Subscriptions";
import Budgets from "./pages/Budgets";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import BankIntegration from "./pages/BankIntegration";

// Import layout components
import Sidebar from "./components/Sidebar";

// Initialize QueryClient
const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", width: "100%", backgroundColor: "background.default" }}>
      {isMobile ? (
        <>
          <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid rgba(0, 0, 0, 0.08)" }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={() => setIsSidebarOpen(true)} aria-label="open menu">
                <Menu size={20} />
              </IconButton>
              <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>
                FinTrack
              </Typography>
            </Toolbar>
          </AppBar>
          <Drawer open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
            <Sidebar mobile onNavigate={() => setIsSidebarOpen(false)} />
          </Drawer>
        </>
      ) : null}

      <Box
        sx={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
          boxShadow: isMobile ? "none" : "0px 0px 40px rgba(0,0,0,0.05)",
          position: "relative",
          backgroundColor: "background.default",
        }}
      >
        {!isMobile ? <Sidebar /> : null}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/bank-integration" element={<BankIntegration />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* authentication context */}
        <AuthProvider>
          <I18nProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;