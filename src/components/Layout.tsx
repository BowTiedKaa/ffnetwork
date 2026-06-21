import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Session } from "@supabase/supabase-js";
import { Home, Users, Building2, Calendar, LogOut, HelpCircle, Shield, Sparkles, Gauge } from "lucide-react";
import { SimpleOnboarding } from "@/components/SimpleOnboarding";
import { useUserAccess } from "@/hooks/useUserAccess";
import { RedeemCodeDialog } from "@/components/RedeemCodeDialog";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Crown, Settings, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import logo from "@/assets/former-fed-logo.jpg";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
  allowAnonymous?: boolean;
}

const Layout = ({ children, requireAdmin = false, allowAnonymous = false }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboardingReplay, setShowOnboardingReplay] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: accessLoading, isAdmin, isPro, tierExpiresAt } = useUserAccess(user?.id);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id || !isPro) {
      setHasSubscription(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasSubscription(!!data));
  }, [user?.id, isPro]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/pricing`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({
        title: "Couldn't open billing portal",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id) {
          import("@/lib/tracking/visitor")
            .then((m) => m.attachUser(session.user!.id))
            .catch(() => {});
        }

        if (!session && !allowAnonymous && location.pathname !== "/auth") {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

        if (session?.user?.id) {
          import("@/lib/tracking/visitor")
            .then((m) => m.attachUser(session.user!.id))
            .catch(() => {});
        }

      if (!session && !allowAnonymous && location.pathname !== "/auth") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location, allowAnonymous]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleReplayOnboarding = () => {
    setShowOnboardingReplay(true);
  };

  const handleOnboardingReplayComplete = () => {
    setShowOnboardingReplay(false);
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/contacts", label: "Contacts", icon: Users },
    { path: "/companies", label: "Companies", icon: Building2 },
    { path: "/follow-ups", label: "Follow-ups", icon: Calendar },
    { path: "/pitch-builder", label: "Pitch Builder", icon: Sparkles },
    ...(isAdmin
      ? [
          { path: "/admin", label: "Admin", icon: Shield },
          { path: "/seo-scan", label: "SEO scan", icon: Gauge },
        ]
      : []),
  ];

  if (!user) {
    if (!allowAnonymous) return <>{children}</>;
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="border-b bg-card">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center"
                aria-label="Former Fed home"
              >
                <img
                  src={logo}
                  alt="Former Fed"
                  className="h-10 w-auto"
                  width={160}
                  height={40}
                  fetchPriority="high"
                  decoding="async"
                />
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
                <Button
                  onClick={() =>
                    navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`)
                  }
                >
                  Sign in
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
        <footer className="border-t mt-8">
          <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-wrap justify-between gap-2">
            <span>© {new Date().getFullYear()} Former Fed</span>
            <div className="flex gap-4">
              <button onClick={() => navigate("/")} className="hover:text-foreground">Home</button>
              <button onClick={() => navigate("/auth")} className="hover:text-foreground">Sign in</button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Not authorized.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <SimpleOnboarding
        open={showOnboardingReplay}
        onAddConnector={() => {
          setShowOnboardingReplay(false);
          navigate("/contacts?addConnector=true");
        }}
        onComplete={handleOnboardingReplayComplete}
      />
      
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <img
                src={logo}
                alt="Former Fed"
                className="h-10 w-auto"
                width={160}
                height={40}
                fetchPriority="high"
                decoding="async"
              />
              <div className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? "secondary" : "ghost"}
                      onClick={() => navigate(item.path)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPro ? (
                <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => navigate("/pricing")}
                        className="cursor-pointer"
                        aria-label="View Pro subscription details"
                      >
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200">
                          <Crown className="h-3 w-3" /> Pro
                        </Badge>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {tierExpiresAt
                        ? `Active until ${format(new Date(tierExpiresAt), "MMM d, yyyy")}`
                        : "Pro access active"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasSubscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="gap-2"
                    aria-label="Manage subscription"
                  >
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Manage subscription</span>
                  </Button>
                )}
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRedeemOpen(true)}
                  className="gap-2"
                  aria-label="Redeem code"
                >
                  <KeyRound className="h-4 w-4" />
                  <span className="hidden sm:inline">Redeem code</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplayOnboarding}
                className="gap-2 text-muted-foreground hover:text-foreground"
                aria-label="View onboarding"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">View onboarding</span>
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
    </div>
  );
};

export default Layout;
