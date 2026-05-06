import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRedeemed?: () => void;
}

export const RedeemCodeDialog = ({ open, onOpenChange, onRedeemed }: Props) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const reset = () => {
    setCode("");
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_access_code", { _code: cleaned });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { success: boolean; error?: string; expires_at?: string };
    if (!result?.success) {
      toast({ title: "Could not activate", description: result?.error || "Try again.", variant: "destructive" });
      return;
    }
    setSuccess(result.expires_at || "");
    onRedeemed?.();
    // Notify admin (best-effort)
    try {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      supabase.functions.invoke("notify-admin", {
        body: {
          event: "code_redeemed",
          email: u?.email,
          fullName: (u?.user_metadata as any)?.full_name ?? null,
          details: { code: cleaned, expires_at: result.expires_at },
        },
      }).catch((e) => console.error("notify-admin redeem failed", e));
    } catch (e) {
      console.error("notify-admin redeem failed", e);
    }
    // Reload after a brief moment to refresh tier state across the app
    setTimeout(() => {
      window.location.reload();
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Your Access Code</DialogTitle>
        </DialogHeader>
        {success !== null ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <p className="font-semibold text-lg">You're in.</p>
            <p className="text-sm text-muted-foreground">
              Pro access activated{success ? ` until ${format(new Date(success), "MMM d, yyyy")}` : ""}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="FF-2025-XXXXXX"
              autoCapitalize="characters"
              className="font-mono"
            />
            <Button type="submit" className="w-full gap-2" disabled={loading || !code.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Activate
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Get an access code at{" "}
              <a href="https://formerfed.gumroad.com" target="_blank" rel="noreferrer" className="underline">
                formerfed.gumroad.com
              </a>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};