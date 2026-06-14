import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Companies = lazy(() => import("./pages/Companies"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const PitchBuilder = lazy(() => import("./pages/PitchBuilder"));
const Admin = lazy(() => import("./pages/Admin"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SeoScan = lazy(() => import("./pages/SeoScan"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
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
            path="/seo-scan"
            element={
              <Layout requireAdmin>
                <SeoScan />
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
