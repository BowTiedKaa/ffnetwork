import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import FollowUps from "./pages/FollowUps";
import PitchBuilder from "./pages/PitchBuilder";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import CheckoutReturn from "./pages/CheckoutReturn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/contacts"
            element={
              <Layout>
                <Contacts />
              </Layout>
            }
          />
          <Route
            path="/companies"
            element={
              <Layout>
                <Companies />
              </Layout>
            }
          />
          <Route
            path="/follow-ups"
            element={
              <Layout>
                <FollowUps />
              </Layout>
            }
          />
          <Route
            path="/pitch-builder"
            element={
              <Layout>
                <PitchBuilder />
              </Layout>
            }
          />
          <Route
            path="/admin"
            element={
              <Layout requireAdmin>
                <Admin />
              </Layout>
            }
          />
          <Route
            path="/pricing"
            element={
              <Layout>
                <Pricing />
              </Layout>
            }
          />
          <Route
            path="/checkout/return"
            element={
              <Layout>
                <CheckoutReturn />
              </Layout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
