import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setPolling(false);
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
          setPolling(false);
          clearInterval(interval);
          return;
        }
      }
      if (attempts >= 10) {
        setPolling(false);
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="max-w-md mx-auto pt-12">
      <Card className="p-8 text-center space-y-4">
        {polling ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Activating your Pro access…</h1>
            <p className="text-sm text-muted-foreground">
              We're confirming your payment with our payment provider.
            </p>
          </>
        ) : (
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
      </Card>
    </div>
  );
}