import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Session } from "@supabase/supabase-js";
import { Home, Users, Building2, Calendar, LogOut, HelpCircle } from "lucide-react";
import { SimpleOnboarding } from "@/components/SimpleOnboarding";
import logo from "@/assets/former-fed-logo.jpg";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboardingReplay, setShowOnboardingReplay] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
  ];

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
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
    </div>
  );
};

export default Layout;
