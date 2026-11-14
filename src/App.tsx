import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChallengeProvider } from "@/contexts/ChallengeContext";
import { AppDownloadBanner } from "@/components/AppDownloadBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ChallengesPage from "./pages/Challenges";
import SubmitBook from "./pages/SubmitBook";
import MyProgress from "./pages/MyProgress";
import Leaderboard from "./pages/Leaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import MigrationCheck from "./pages/MigrationCheck";
import SettingsPage from "./pages/Settings";
import EmailInboxPage from "./pages/EmailInbox";
import CertificatesPage from "./pages/Certificates";
import CertificateVerification from "./components/CertificateVerification";
import NotFound from "./pages/NotFound";
import AppShell from "./components/AppSidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingThemeSelector from "./components/FloatingThemeSelector";

const queryClient = new QueryClient();

// Protected Route wrapper - opens directly without blocking loading screens
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

// Auth Route wrapper - opens directly without loading screens
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={
        <AuthRoute>
          <Auth />
        </AuthRoute>
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/challenges" element={
        <ProtectedRoute>
          <ChallengesPage />
        </ProtectedRoute>
      } />
      <Route path="/brochure" element={<Navigate to="/challenges" replace />} />
      <Route path="/categories" element={<Navigate to="/#categories" replace />} />
      <Route path="/realms" element={<Navigate to="/#categories" replace />} />
      <Route path="/submit" element={
        <ProtectedRoute>
          <SubmitBook />
        </ProtectedRoute>
      } />
      <Route path="/progress" element={
        <ProtectedRoute>
          <MyProgress />
        </ProtectedRoute>
      } />
      <Route path="/my-progress" element={<Navigate to="/progress" replace />} />
      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <Leaderboard />
        </ProtectedRoute>
      } />
      <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/migration-check" element={
        <ProtectedRoute>
          <MigrationCheck />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute>
          <EmailInboxPage />
        </ProtectedRoute>
      } />
      <Route path="/email-inbox" element={<Navigate to="/inbox" replace />} />
      <Route path="/certificates" element={<CertificatesPage />} />
      <Route path="/verify-certificate" element={<CertificateVerification />} />
      <Route path="/verify-certificate/:id" element={<CertificateVerification />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <ChallengeProvider>
                <AppRoutes />
                <AppDownloadBanner />
                <FloatingThemeSelector />
              </ChallengeProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
