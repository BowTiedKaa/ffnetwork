import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

type Status = "polling" | "success" | "timeout" | "no_session";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<Status>("polling");

  useEffect(() => {
    if (!sessionId) {
      setStatus("no_session");
      return;
    }
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.tier === "pro") {
          setStatus("success");
          clearInterval(interval);
          return;
        }
      }
      if (attempts >= 15) {
        setStatus("timeout");
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="max-w-md mx-auto pt-12">
      <Card className="p-8 text-center space-y-4">
        {status === "polling" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Activating your Pro access…</h1>
            <p className="text-sm text-muted-foreground">
              We're confirming your payment. This usually takes a few seconds.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">You're in!</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to FF Network Pro. All Pro features are now unlocked.
            </p>
            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              Go to dashboard
            </Button>
          </>
        )}
        {status === "timeout" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
            <h1 className="text-xl font-semibold">Still processing your payment</h1>
            <p className="text-sm text-muted-foreground">
              Your payment went through but Pro access hasn't activated yet. This sometimes
              takes a minute. Refresh in a moment, or contact support if it persists.
            </p>
            <p className="text-xs text-muted-foreground font-mono">Session: {sessionId}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                Check again
              </Button>
              <Button className="flex-1" onClick={() => navigate("/dashboard")}>
                Go to dashboard
              </Button>
            </div>
          </>
        )}
        {status === "no_session" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold">No checkout session found</h1>
            <Button className="w-full" onClick={() => navigate("/pricing")}>
              Back to pricing
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}