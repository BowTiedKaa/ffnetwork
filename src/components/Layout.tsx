import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Session } from "@supabase/supabase-js";
import { Home, Users, Building2, Calendar, LogOut, HelpCircle, Shield, Sparkles } from "lucide-react";
import { SimpleOnboarding } from "@/components/SimpleOnboarding";
import { useUserAccess } from "@/hooks/useUserAccess";
import { RedeemCodeDialog } from "@/components/RedeemCodeDialog";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import logo from "@/assets/former-fed-logo.jpg";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

interface LayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const Layout = ({ children, requireAdmin = false }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboardingReplay, setShowOnboardingReplay] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: accessLoading, isAdmin, isPro, tierExpiresAt } = useUserAccess(user?.id);
  const [redeemOpen, setRedeemOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session && location.pathname !== "/auth") {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

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
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  if (!user) {
    return <>{children}</>;
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
              <img src={logo} alt="Former Fed" className="h-10" />
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
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRedeemOpen(true)}
                  className="gap-2"
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
