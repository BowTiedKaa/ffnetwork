import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { SEO } from "@/components/SEO";
import { passwordSchema, passwordHelperText } from "@/lib/passwordRules";
import { PasswordRequirements } from "@/components/PasswordRequirements";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  fullName: z.string().optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.parse({ email, password, fullName });

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.email,
          password: validation.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        try { (await import("@/lib/tracking/visitor")).track("login_completed"); } catch {}
        navigate(safeRedirect);
      } else {
        try { (await import("@/lib/tracking/visitor")).track("signup_started"); } catch {}
        const { error } = await supabase.auth.signUp({
          email: validation.email,
          password: validation.password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect}`,
            data: {
              full_name: validation.fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        // Notify admin of new signup (best-effort)
        supabase.functions.invoke("notify-admin", {
          body: { event: "signup", email: validation.email, fullName: validation.fullName ?? null },
        }).catch((e) => console.error("notify-admin signup failed", e));

        toast({
          title: "Account created!",
          description: "Welcome to your networking tracker.",
        });
        navigate(safeRedirect);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reset link sent",
        description: "Check your email for a link to reset your password.",
      });
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO
        title={isLogin ? "Sign in — FF Network" : "Create your FF Network account"}
        description="Sign in or create a free FF Network account to track your federal-to-tech networking, follow-ups, and pitch."
        path="/auth"
      />
      <div className="w-full max-w-md space-y-6">
        {/* Context Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Sign in to FF Network</h1>
          <h2 className="text-xl font-semibold">What is FF Network?</h2>
          <p className="text-muted-foreground text-sm">
            A focused networking tool that helps you see who can help you reach the teams and opportunities you care about.
          </p>
        </div>

        <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your networking tracker"
              : "Start building your professional network"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showResetPassword ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                onClick={handleResetPassword} 
                className="w-full" 
                disabled={sendingReset}
              >
                {sendingReset ? "Sending..." : "Send reset link"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail("");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {!isLogin && (
                  <>
                    <p className="text-xs text-muted-foreground">{passwordHelperText}</p>
                    <PasswordRequirements value={password} className="pt-1" />
                  </>
                )}
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowResetPassword(true);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </main>
  );
};

export default Auth;
